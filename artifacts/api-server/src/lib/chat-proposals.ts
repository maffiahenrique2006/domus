// Cadastro por conversa: a IA PROPÕE clientes e demandas; ela nunca grava.
// Este módulo define o formato que a IA devolve e limpa cada proposta contra a
// configuração do escritório. A gravação acontece depois, quando o gestor
// confirma na tela, pela mesma rota /workspace/actions usada pelos formulários.
import { z } from 'zod/v4';
import type { Configuration } from './workspace-validation';

const MAX_PROPOSALS = 8;
const PRIORITIES = ['urgente', 'alta', 'media', 'baixa'] as const;

const string = { type: 'string' };
const object = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/** JSON Schema estrito enviado à OpenAI (saída estruturada). */
export const chatReplyJsonSchema = object({
  reply: string,
  proposals: {
    type: 'array',
    items: object({
      kind: { type: 'string', enum: ['client', 'demand'] },
      clientName: string,
      email: string,
      title: string,
      service: string,
      responsible: string,
      priority: { type: 'string', enum: [...PRIORITIES] },
      dueDate: string,
      estimatedValue: { type: 'number' },
      description: string,
      customValues: {
        type: 'array',
        items: object({ fieldId: string, value: string }),
      },
    }),
  },
});

const rawProposal = z.object({
  kind: z.enum(['client', 'demand']),
  clientName: z.string(),
  email: z.string(),
  title: z.string(),
  service: z.string(),
  responsible: z.string(),
  priority: z.enum(PRIORITIES).catch('media'),
  dueDate: z.string(),
  estimatedValue: z.number().catch(0),
  description: z.string(),
  customValues: z.array(z.object({ fieldId: z.string(), value: z.string() })).catch([]),
});
const rawReply = z.object({
  reply: z.string().trim().min(1).max(4000),
  proposals: z.array(rawProposal).catch([]),
});

export interface ClientProposal {
  kind: 'client';
  name: string;
  email: string;
}
export interface DemandProposal {
  kind: 'demand';
  title: string;
  client: string;
  service: string;
  responsible: string;
  priority: (typeof PRIORITIES)[number];
  dueDate: string;
  estimatedValue: number;
  description: string;
  customValues: Record<string, string | number>;
  /** Rótulos de campos obrigatórios que o gestor não informou. */
  missing: string[];
}
export type Proposal = ClientProposal | DemandProposal;

const clean = (value: string, max: number) => value.trim().slice(0, max);
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const isDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};

/**
 * Converte a resposta crua da IA em propostas seguras.
 * Tudo o que não bate com a configuração do escritório é descartado aqui;
 * o que sobra ainda passa pela validação completa na hora de gravar.
 */
export function parseChatReply(
  text: string,
  config: Configuration | null,
  existingClients: { name: string }[],
): { reply: string; proposals: Proposal[] } {
  const parsed = rawReply.parse(JSON.parse(text));
  // Sem escritório configurado não existe onde cadastrar.
  if (!config) return { reply: parsed.reply, proposals: [] };

  const proposals: Proposal[] = [];
  const proposedClients: string[] = [];
  const demandFields = config.fields.filter((f) => f.entity === 'demand');

  for (const raw of parsed.proposals) {
    if (proposals.length >= MAX_PROPOSALS) break;
    const clientName = clean(raw.clientName, 200);
    if (!clientName) continue;

    if (raw.kind === 'client') {
      const duplicate =
        existingClients.some((c) => sameName(c.name, clientName)) ||
        proposedClients.some((name) => sameName(name, clientName));
      if (duplicate) continue;
      const email = clean(raw.email, 250);
      proposedClients.push(clientName);
      proposals.push({
        kind: 'client',
        name: clientName,
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
      });
      continue;
    }

    const title = clean(raw.title, 200);
    if (!title) continue;
    const customValues: Record<string, string | number> = {};
    for (const { fieldId, value } of raw.customValues) {
      const field = demandFields.find((f) => f.id === fieldId);
      const trimmed = value.trim();
      if (!field || !trimmed) continue;
      if (field.type === 'number') {
        const n = Number(trimmed.replace(',', '.'));
        if (Number.isFinite(n)) customValues[field.id] = n;
      } else if (field.type === 'select') {
        const option = field.options.find((o) => sameName(o, trimmed));
        if (option) customValues[field.id] = option;
      } else {
        customValues[field.id] = trimmed.slice(0, 2000);
      }
    }
    const service = config.services.find((s) => sameName(s, raw.service)) ?? '';
    const value = Math.round(Math.max(0, Math.min(raw.estimatedValue, 999_999_999)) * 100) / 100;
    proposals.push({
      kind: 'demand',
      title,
      client: clientName,
      service,
      responsible: clean(raw.responsible, 200),
      priority: raw.priority,
      dueDate: isDate(raw.dueDate) ? raw.dueDate : '',
      estimatedValue: Number.isFinite(value) ? value : 0,
      description: clean(raw.description, 8000),
      customValues,
      missing: demandFields
        .filter((f) => f.required && customValues[f.id] === undefined)
        .map((f) => f.label),
    });
  }
  return { reply: parsed.reply, proposals };
}

export const PROPOSAL_RULES = `
Responda SEMPRE no formato JSON pedido. "reply" é o texto para o gestor, em até 6 frases.
Se o gestor pedir para cadastrar, registrar, criar ou adicionar clientes ou demandas, devolva cada registro em "proposals". Você NÃO grava nada: diga no reply que são propostas e que o gestor precisa confirmar cada uma. Nunca diga que salvou, cadastrou ou criou.
Se não houver pedido de cadastro, "proposals" é uma lista vazia.
Use somente o que o gestor escreveu. Campo não informado fica vazio: texto "", valor 0, data "". Não invente e-mail, prazo, valor, responsável nem cliente.
kind "client": preencha clientName e, se informado, email. Os outros campos ficam vazios. Não proponha cliente que já está em context.clients.
kind "demand": clientName é o cliente da demanda; title é o nome curto do pedido; service deve ser exatamente um dos context.configuration.services ou ""; responsible é quem executa; priority é urgente, alta, media ou baixa (use media se não informado); dueDate no formato AAAA-MM-DD ou "".
customValues só aceita fieldId listado em context.configuration.demandFields; em campo do tipo select use exatamente uma das options.
No máximo 8 propostas por resposta. Se o pedido tiver mais, proponha as 8 primeiras e avise no reply.`;
