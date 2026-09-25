import Stripe from "stripe";

export class MissingStripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingStripeConfigError";
  }
}

let cachedClient: Stripe | null = null;
let cachedKey: string | null = null;

/** Lazily builds (and caches) the Stripe client from process.env.STRIPE_SECRET_KEY. */
export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey?.startsWith("sk_test_")) {
    throw new MissingStripeConfigError("STRIPE_SECRET_KEY must be a test key in this academic MVP");
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new Stripe(apiKey, { timeout: 10000, maxNetworkRetries: 1 });
    cachedKey = apiKey;
  }

  return cachedClient;
}

export function getStripePriceId(): string {
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new MissingStripeConfigError("STRIPE_PRICE_ID is not configured");
  }
  return priceId;
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new MissingStripeConfigError("STRIPE_WEBHOOK_SECRET is not configured");
  }
  return secret;
}

export function getAppUrl(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new MissingStripeConfigError("APP_URL is not configured");
  }
  return appUrl.replace(/\/$/, "");
}
