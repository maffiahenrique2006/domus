import OpenAI from "openai";
import { MissingApiKeyError } from "./domus-ai-errors";

let cachedClient: OpenAI | null = null;
let cachedKey: string | null = null;

/** Lazily builds (and caches) the OpenAI client from process.env.OPENAI_API_KEY. Never called from the browser. */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError();
  }

  if (!cachedClient || cachedKey !== apiKey) {
    cachedClient = new OpenAI({ apiKey });
    cachedKey = apiKey;
  }

  return cachedClient;
}
