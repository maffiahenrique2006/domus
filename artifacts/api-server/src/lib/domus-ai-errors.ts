/**
 * Typed errors for the Domus AI call path. Routes map these to HTTP
 * responses that never leak internal details (stack traces, provider error
 * bodies, secret values) to the browser.
 */
export class MissingApiKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not configured");
    this.name = "MissingApiKeyError";
  }
}

export class MissingModelError extends Error {
  constructor() {
    super("OPENAI_MODEL is not configured");
    this.name = "MissingModelError";
  }
}

export class AiRateLimitedError extends Error {
  constructor() {
    super("OpenAI rate limit reached");
    this.name = "AiRateLimitedError";
  }
}

export class AiUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("OpenAI request failed");
    this.name = "AiUnavailableError";
    this.cause = cause;
  }
}
