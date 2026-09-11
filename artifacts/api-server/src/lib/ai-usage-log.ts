import { logger } from "./logger";
import type { DomusAiResult } from "./domus-ai";

/**
 * Structured, content-free record of one Domus AI call. Never include
 * message text here — only counts and identifiers, so this is safe to keep
 * in server logs indefinitely.
 */
export function logAiUsage(sessionId: string, usage: DomusAiResult["usage"]) {
  logger.info(
    {
      event: "domus_ai_usage",
      sessionId,
      model: usage.model,
      responseId: usage.responseId,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      at: new Date().toISOString(),
    },
    "domus-ai usage",
  );
}
