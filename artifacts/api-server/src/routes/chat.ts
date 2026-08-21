import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, chatMessagesTable } from "@workspace/db";
import {
  SendChatMessageBody,
  DeleteChatMessageParams,
  GetChatMessagesResponse,
  SendChatMessageResponse,
  DeleteChatMessageResponse,
  ClearChatResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Domus AI persona — simple rule-based responses in Portuguese
function buildDomusResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes("demanda") || msg.includes("tarefa") || msg.includes("pendente")) {
    return "Entendi. Para manter suas demandas organizadas, recomendo que você as classifique por área e prioridade. Consegue me dizer quais áreas estão mais sobrecarregadas agora?";
  }
  if (msg.includes("financeiro") || msg.includes("receita") || msg.includes("despesa") || msg.includes("dinheiro")) {
    return "Vamos olhar para o financeiro juntos. Um ponto importante: antes de analisar os números, é preciso garantir que as categorias estejam bem definidas. Você já tem clareza sobre as principais fontes de receita do seu negócio?";
  }
  if (msg.includes("ajuda") || msg.includes("como") || msg.includes("o que")) {
    return "Estou aqui para ajudar você a enxergar com clareza o que está acontecendo na empresa. Posso te ajudar a organizar demandas, analisar o financeiro ou simplesmente pensar sobre decisões importantes. Por onde quer começar?";
  }
  if (msg.includes("bom dia") || msg.includes("boa tarde") || msg.includes("boa noite") || msg.includes("oi") || msg.includes("olá")) {
    return "Olá! Que bom ter você aqui. Estou pronta para trabalhar. Como está o ritmo do negócio hoje? Tem algo específico que precisamos resolver ou prefere começar com uma visão geral?";
  }
  if (msg.includes("obrigad") || msg.includes("valeu")) {
    return "Disponha! É exatamente para isso que estou aqui — garantir que você tenha clareza e controle, sem precisar carregar toda a estrutura sozinha. Se precisar de mais alguma coisa, estou aqui.";
  }
  if (msg.includes("equipe") || msg.includes("time") || msg.includes("pessoa") || msg.includes("colaborador")) {
    return "Falar sobre equipe é importante. Gestão de pessoas é uma das áreas que mais impacta o resultado do negócio. Como você está distribuindo as responsabilidades hoje?";
  }
  if (msg.includes("meta") || msg.includes("objetivo") || msg.includes("planejamento") || msg.includes("resultado")) {
    return "Metas bem definidas são a bússola do negócio. Você tem objetivos claros para os próximos 30, 60 e 90 dias? Vamos estruturar isso de forma que seja simples de acompanhar.";
  }
  if (msg.includes("estress") || msg.includes("cansad") || msg.includes("difícil") || msg.includes("dificil") || msg.includes("sobrecarreg")) {
    return "Entendo. Gerir um negócio sozinha, ou com equipe pequena, é intenso. O que mais está pesando agora? Às vezes nomear o problema é o primeiro passo para resolver.";
  }

  return "Recebido. Deixa eu processar isso com você. Com base no que você disse, o próximo passo mais importante parece ser organizar as prioridades. Quer que a gente faça isso agora, ou tem algo mais urgente para tratar primeiro?";
}

router.get("/chat/messages", async (req, res): Promise<void> => {
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .orderBy(chatMessagesTable.createdAt);

  res.json(GetChatMessagesResponse.parse(messages));
});

router.post("/chat/messages", async (req, res): Promise<void> => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Save user message
  await db.insert(chatMessagesTable).values({
    role: "user",
    content: parsed.data.content,
  });

  // Generate and save AI response
  const aiContent = buildDomusResponse(parsed.data.content);
  const [aiMsg] = await db
    .insert(chatMessagesTable)
    .values({ role: "assistant", content: aiContent })
    .returning();

  res.json(SendChatMessageResponse.parse(aiMsg));
});

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
