import OpenAI from "openai";
import { getOpenAIClient } from "./openai-client";
import {
  AiRateLimitedError,
  AiUnavailableError,
  MissingModelError,
} from "./domus-ai-errors";

// Small, fixed limits appropriate for an academic MVP demo — not a production
// chat product. Input length is also enforced by the Zod request schema;
// this is a second line of defense at the call site.
const MAX_OUTPUT_TOKENS = 500;

const SYSTEM_PROMPT = `
Você é a Domus AI, assistente da Vértice Espaços — um escritório de arquitetura e design de interiores fictício, usado como demonstração acadêmica do sistema Domus (MVP de faculdade, não é a Domus oficial).

Você ajuda a organizar três áreas do escritório:
- Demandas: leads e solicitações de clientes, por área, prioridade e status.
- Projetos: fases, tarefas, orçamento e cronograma de cada obra/projeto.
- Financeiro: contas a receber e a pagar, margem por projeto, fluxo de caixa.

Regras de resposta:
- Responda sempre em português do Brasil, em tom claro, direto e profissional.
- Este é um MVP de demonstração: você não tem acesso em tempo real ao banco de dados da Vértice Espaços. Se o usuário pedir números ou dados específicos que você não recebeu no contexto da conversa, diga isso com transparência em vez de inventar valores.
- Seja objetiva: normalmente 2 a 6 frases, a menos que o usuário peça mais detalhe.
`.trim();

export interface DomusAiResult {
  text: string;
  usage: {
    model: string;
    responseId: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

export async function askDomusAi(userMessage: string): Promise<DomusAiResult> {
  const model = process.env.OPENAI_MODEL;
  if (!model) {
    throw new MissingModelError();
  }

  const client = getOpenAIClient();

  let response;
  try {
    response = await client.responses.create({
      model,
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    });
  } catch (err) {
    if (err instanceof OpenAI.RateLimitError) {
      throw new AiRateLimitedError();
    }
    throw new AiUnavailableError(err);
  }

  const text = response.output_text?.trim();
  if (!text) {
    throw new AiUnavailableError(new Error("empty output_text"));
  }

  const usage = response.usage;

  return {
    text,
    usage: {
      model: response.model ?? model,
      responseId: response.id,
      inputTokens: usage?.input_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
  };
}
