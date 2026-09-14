import express, { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db, usersTable } from "@workspace/db";
import { CreateCheckoutSessionResponse, GetBillingStatusResponse } from "@workspace/api-zod";
import {
  getAppUrl,
  getStripeClient,
  getStripePriceId,
  getStripeWebhookSecret,
  MissingStripeConfigError,
} from "../lib/stripe-client";
import { logger } from "../lib/logger";

// Requires an authenticated user (mounted with requireAuth in routes/index.ts).
const router: IRouter = Router();

// Public — Stripe calls this directly, verified by signature, not a session.
// Mounted separately in app.ts, before express.json(), because Stripe's
// signature verification needs the exact raw request body bytes.
export const billingWebhookRouter: IRouter = Router();

router.post("/billing/checkout", async (req, res): Promise<void> => {
  const user = req.user!;

  let stripe: Stripe;
  let priceId: string;
  let appUrl: string;
  try {
    stripe = getStripeClient();
    priceId = getStripePriceId();
    appUrl = getAppUrl();
  } catch (err) {
    if (err instanceof MissingStripeConfigError) {
      res.status(503).json({
        error: "A assinatura ainda não está configurada neste ambiente.",
      });
      return;
    }
    throw err;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: String(user.id),
      customer: user.stripeCustomerId ?? undefined,
      customer_email: user.stripeCustomerId ? undefined : user.email,
      success_url: `${appUrl}/conta?checkout=success`,
      cancel_url: `${appUrl}/conta?checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe checkout session has no url");
    }

    res.json(CreateCheckoutSessionResponse.parse({ url: session.url }));
  } catch (err) {
    logger.error({ event: "stripe_checkout_failed" }, "Failed to create Stripe checkout session");
    res.status(502).json({ error: "Não foi possível iniciar o checkout agora. Tente novamente." });
  }
});

router.get("/billing/status", (req, res): void => {
  const user = req.user!;
  res.json(GetBillingStatusResponse.parse({ plan: user.plan, active: user.plan === "pro" }));
});

// Stripe needs the raw request body to verify the webhook signature, so this
// route parses with express.raw() instead of the global express.json() —
// see the export comment above for why it's a separate router.
billingWebhookRouter.post(
  "/billing/webhook",
  express.raw({ type: "application/json" }),
  async (req, res): Promise<void> => {
    let stripe: Stripe;
    let webhookSecret: string;
    try {
      stripe = getStripeClient();
      webhookSecret = getStripeWebhookSecret();
    } catch {
      res.status(503).end();
      return;
    }

    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      res.status(400).end();
      return;
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, signature, webhookSecret);
    } catch {
      res.status(400).end();
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = session.client_reference_id ? Number(session.client_reference_id) : NaN;
          if (!Number.isNaN(userId)) {
            await db
              .update(usersTable)
              .set({
                plan: "pro",
                stripeCustomerId:
                  typeof session.customer === "string" ? session.customer : undefined,
                stripeSubscriptionId:
                  typeof session.subscription === "string" ? session.subscription : undefined,
              })
              .where(eq(usersTable.id, userId));
          }
          break;
        }
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          const active = subscription.status === "active" || subscription.status === "trialing";
          const customerId =
            typeof subscription.customer === "string" ? subscription.customer : undefined;
          if (customerId) {
            await db
              .update(usersTable)
              .set({ plan: active ? "pro" : "free" })
              .where(eq(usersTable.stripeCustomerId, customerId));
          }
          break;
        }
        default:
          break;
      }

      res.json({ received: true });
    } catch (err) {
      logger.error({ event: "stripe_webhook_handler_failed" }, "Stripe webhook handler failed");
      res.status(500).end();
    }
  },
);

export default router;
