import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, chatMessagesTable } from "@workspace/db";
import {
  SendChatMessageBody,
  DeleteChatMessageParams,
  GetChatMessagesResponse,
  SendChatMessageResponse,
  DeleteChatMessageResponse,
  ClearChatResponse,
} from "@workspace/api-zod";
import { askDomusAi } from "../lib/domus-ai";
import { logAiUsage } from "../lib/ai-usage-log";
import { logger } from "../lib/logger";
import { rateLimit } from "../middlewares/rate-limit";
import {
  AiRateLimitedError,
  AiUnavailableError,
  MissingApiKeyError,
  MissingModelError,
} from "../lib/domus-ai-errors";

const router: IRouter = Router();

router.get("/chat/messages", async (req, res): Promise<void> => {
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .orderBy(chatMessagesTable.createdAt);

  res.json(GetChatMessagesResponse.parse(messages));
});

router.post(
  "/chat/messages",
  rateLimit({ windowMs: 60_000, max: 12 }),
  async (req, res): Promise<void> => {
    const parsed = SendChatMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Mensagem inválida." });
      return;
    }

    const sessionId = parsed.data.sessionId ?? "unknown";

    // Save user message
    await db.insert(chatMessagesTable).values({
      role: "user",
      content: parsed.data.content,
    });

    let aiResult;
    try {
      aiResult = await askDomusAi(parsed.data.content);
    } catch (err) {
      if (err instanceof MissingApiKeyError || err instanceof MissingModelError) {
        logger.error({ event: "domus_ai_config_error" }, "Domus AI not configured");
        res.status(503).json({
          error:
            "A Domus AI ainda não está configurada neste ambiente. Peça ao responsável para configurar a chave da OpenAI nos Secrets.",
        });
        return;
      }
      if (err instanceof AiRateLimitedError) {
        res.status(429).json({
          error: "A Domus AI está recebendo muitas solicitações agora. Tente novamente em instantes.",
        });
        return;
      }
      if (err instanceof AiUnavailableError) {
        logger.error({ event: "domus_ai_call_failed" }, "Domus AI call failed");
        res.status(502).json({
          error: "Não foi possível obter uma resposta da Domus AI agora. Tente novamente em instantes.",
        });
        return;
      }
      throw err;
    }

    logAiUsage(sessionId, aiResult.usage);

    const [aiMsg] = await db
      .insert(chatMessagesTable)
      .values({ role: "assistant", content: aiResult.text })
      .returning();

    res.json(
      SendChatMessageResponse.parse({
        message: aiMsg,
        usage: aiResult.usage,
      }),
    );
  },
);

router.delete("/chat/messages/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteChatMessageParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, params.data.id));
  res.json(DeleteChatMessageResponse.parse({ success: true }));
});

router.post("/chat/clear", async (_req, res): Promise<void> => {
  await db.delete(chatMessagesTable);
  res.json(ClearChatResponse.parse({ success: true }));
});

export default router;
