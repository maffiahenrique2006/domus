import express, { Router, type IRouter } from "express";
import Stripe from "stripe";
import { pool } from "@workspace/db";
import { getAppUrl, getStripeClient, getStripePriceId, getStripeWebhookSecret, MissingStripeConfigError } from "../lib/stripe-client";
import { logger } from "../lib/logger";

const router: IRouter = Router();
export const billingWebhookRouter: IRouter = Router();
const active = (status: string) => status === "active" || status === "trialing";
const objectId = (value: unknown): string | null => typeof value === "string" ? value : value && typeof value === "object" && "id" in value ? String(value.id) : null;

router.post("/billing/checkout", async (req, res) => {
  const user = req.user!;
  const client = await pool.connect();
  try {
    const stripe = getStripeClient();
    const priceId = getStripePriceId();
    const appUrl = getAppUrl();
    await client.query("BEGIN");
    await client.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const { rows: [fresh] } = await client.query("SELECT * FROM users WHERE id=$1", [user.id]);
    if (fresh.stripe_subscription_id) {
      const sub = await stripe.subscriptions.retrieve(fresh.stripe_subscription_id);
      if (!["canceled", "incomplete_expired"].includes(sub.status)) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Já existe uma assinatura para esta conta. Consulte o plano antes de iniciar outra." });
        return;
      }
    }
    const { rows: [state] } = await client.query("SELECT * FROM domus_billing_state WHERE user_id=$1", [user.id]);
    if (state?.checkout_id) {
      const pending = await stripe.checkout.sessions.retrieve(state.checkout_id);
      if (pending.status === "open" && pending.url) {
        await client.query("COMMIT"); res.json({ url: pending.url }); return;
      }
      if (pending.status === "complete" && pending.subscription) {
        const sub = await stripe.subscriptions.retrieve(objectId(pending.subscription)!);
        if (!["canceled", "incomplete_expired"].includes(sub.status)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Checkout já concluído. Aguarde a confirmação do Stripe e atualize o plano." });
          return;
        }
      }
    }
    const price = await stripe.prices.retrieve(priceId);
    if (price.livemode || !price.active || !price.recurring) throw new Error("Expected active recurring test price");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }], client_reference_id: String(user.id),
      subscription_data: { metadata: { domus_user_id: String(user.id) } },
      customer: fresh.stripe_customer_id ?? undefined,
      customer_email: fresh.stripe_customer_id ? undefined : user.email,
      success_url: `${appUrl}/conta?checkout=success`, cancel_url: `${appUrl}/conta?checkout=cancelled`,
    }, { idempotencyKey: `domus-checkout-${user.id}-${state?.checkout_id ?? "first"}` });
    if (!session.url || session.livemode) throw new Error("Invalid test checkout");
    await client.query("INSERT INTO domus_billing_state(user_id,checkout_id) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET checkout_id=$2,updated_at=now()", [user.id, session.id]);
    await client.query("COMMIT"); res.json({ url: session.url });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error({ event: "stripe_checkout_failed" }, "Stripe checkout failed");
    res.status(error instanceof MissingStripeConfigError ? 503 : 502).json({ error: error instanceof MissingStripeConfigError ? "A assinatura de teste ainda não está configurada neste ambiente." : "Não foi possível iniciar o checkout. Tente novamente." });
  } finally { client.release(); }
});

router.get("/billing/status", async (req, res) => {
  const { rows: [state] } = await pool.query("SELECT subscription_status,cancel_at_period_end FROM domus_billing_state WHERE user_id=$1", [req.user!.id]);
  res.json({ plan: req.user!.plan, active: req.user!.plan === "pro", mode: "test", status: state?.subscription_status ?? "none", cancelAtPeriodEnd: state?.cancel_at_period_end ?? false, aiDailyLimit: req.user!.plan === "pro" ? 100 : 10 });
});

router.post("/billing/cancel", async (req, res) => {
  if (!req.user!.stripeSubscriptionId) { res.status(409).json({ error: "Não há assinatura para cancelar." }); return; }
  try {
    await getStripeClient().subscriptions.update(req.user!.stripeSubscriptionId, { cancel_at_period_end: true });
    res.json({ success: true, message: "Cancelamento solicitado para o fim do período. A confirmação será recebida pelo webhook." });
  } catch { res.status(502).json({ error: "Não foi possível solicitar o cancelamento agora." }); }
});

billingWebhookRouter.post("/billing/webhook", express.raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
  let stripe: Stripe;
  let event: Stripe.Event;
  try {
    stripe = getStripeClient();
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") { res.sendStatus(400); return; }
    event = stripe.webhooks.constructEvent(req.body as Buffer, signature, getStripeWebhookSecret());
  } catch (error) { res.sendStatus(error instanceof MissingStripeConfigError ? 503 : 400); return; }
  if (event.livemode) { res.status(400).json({ error: "Este MVP aceita apenas eventos de teste." }); return; }
  const supported = ["checkout.session.completed", "checkout.session.async_payment_succeeded", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"];
  if (!supported.includes(event.type)) { res.json({ received: true }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const receipt = await client.query("INSERT INTO domus_billing_events(event_id,event_type) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING event_id", [event.id,event.type]);
    if (!receipt.rowCount) { await client.query("COMMIT"); res.json({ received: true, duplicate: true }); return; }
    const obj = event.data.object;
    const isCheckout = event.type.startsWith("checkout.");
    const subId = isCheckout ? objectId((obj as Stripe.Checkout.Session).subscription) : (obj as Stripe.Subscription).id;
    if (!subId) { await client.query("COMMIT"); res.json({ received: true }); return; }
    const customerId = objectId((obj as Stripe.Subscription).customer);
    const ownerId = isCheckout ? Number((obj as Stripe.Checkout.Session).client_reference_id) : Number((obj as Stripe.Subscription).metadata?.domus_user_id);
    const { rows: [owner] } = Number.isSafeInteger(ownerId) && ownerId > 0
      ? await client.query("SELECT * FROM users WHERE id=$1 FOR UPDATE", [ownerId])
      : await client.query("SELECT * FROM users WHERE stripe_subscription_id=$1 FOR UPDATE", [subId]);
    // A Stripe account may serve multiple apps. A shared customer is not proof
    // that a new subscription belongs to Domus. Legacy checkouts still carry
    // client_reference_id, and previously linked subscriptions match by ID.
    if (!owner) { await client.query("COMMIT"); res.json({ received: true, ignored: true }); return; }
    // Retrieve AFTER the owner lock so a delayed event cannot restore an old plan.
    const sub = await stripe.subscriptions.retrieve(subId);
    const matchesPrice = sub.items.data.some(item => item.price.id === getStripePriceId());
    // Do not attach another product merely because its signed event contains a
    // matching user reference. Already linked subscriptions must still be
    // reconciled when their price changes, so that Pro can be revoked.
    if (!matchesPrice && owner.stripe_subscription_id !== sub.id) {
      await client.query("COMMIT"); res.json({ received: true, ignored: true }); return;
    }
    if (sub.livemode || objectId(sub.customer) !== customerId || (owner.stripe_customer_id && owner.stripe_customer_id !== customerId)) throw new Error("Billing owner mismatch");
    if (owner.stripe_subscription_id && owner.stripe_subscription_id !== sub.id) {
      const current = await stripe.subscriptions.retrieve(owner.stripe_subscription_id);
      if (!["canceled", "incomplete_expired"].includes(current.status)) { await client.query("COMMIT"); res.json({ received: true }); return; }
    }
    const plan = active(sub.status) && matchesPrice ? "pro" : "free";
    await client.query("UPDATE users SET plan=$1,stripe_customer_id=$2,stripe_subscription_id=$3 WHERE id=$4", [plan,customerId,sub.id,owner.id]);
    await client.query("INSERT INTO domus_billing_state(user_id,subscription_status,cancel_at_period_end) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET subscription_status=$2,cancel_at_period_end=$3,updated_at=now()", [owner.id,sub.status,sub.cancel_at_period_end]);
    await client.query("COMMIT"); res.json({ received: true });
  } catch {
    await client.query("ROLLBACK");
    logger.error({ event: "stripe_webhook_handler_failed" }, "Stripe webhook failed; safe to retry");
    res.sendStatus(500);
  } finally { client.release(); }
});
export default router;
