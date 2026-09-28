// Cadastro por conversa: a IA PROPÕE; ela nunca grava.
// Cobre quatro gestos: cliente, demanda, transformar demanda em caso e lançamento financeiro.
// Este módulo define o formato que a IA devolve e limpa cada proposta contra a
// configuração e os registros do escritório. A gravação acontece depois, quando o
// gestor confirma na tela, pela mesma rota /workspace/actions usada pelos formulários.
import { z } from 'zod/v4';
import type { Configuration } from './workspace-validation';

const MAX_PROPOSALS = 10;
const PRIORITIES = ['urgente', 'alta', 'media', 'baixa'] as const;
const KINDS = ['client', 'demand', 'case', 'financial'] as const;
const FINANCIAL_TYPES = ['receber', 'pagar'] as const;

const string = { type: 'string' };
const object = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/** JSON Schema estrito enviado à OpenAI (saída estruturada). Um formato único, plano, para os quatro tipos. */
export const chatReplyJsonSchema = object({
  reply: string,
  proposals: {
    type: 'array',
    items: object({
      kind: { type: 'string', enum: [...KINDS] },
      clientName: string,
      email: string,
      title: string,
      service: string,
      responsible: string,
      priority: { type: 'string', enum: [...PRIORITIES] },
      dueDate: string,
      amount: { type: 'number' },
      description: string,
      customValues: {
        type: 'array',
        items: object({ fieldId: string, value: string }),
      },
      demandId: string,
      projectId: string,
      financialType: { type: 'string', enum: [...FINANCIAL_TYPES] },
      settled: { type: 'boolean' },
      category: string,
    }),
  },
});

const rawProposal = z.object({
  kind: z.enum(KINDS),
  clientName: z.string().catch(''),
  email: z.string().catch(''),
  title: z.string().catch(''),
  service: z.string().catch(''),
  responsible: z.string().catch(''),
  priority: z.enum(PRIORITIES).catch('media'),
  dueDate: z.string().catch(''),
  amount: z.number().catch(0),
  description: z.string().catch(''),
  customValues: z.array(z.object({ fieldId: z.string(), value: z.string() })).catch([]),
  demandId: z.string().catch(''),
  projectId: z.string().catch(''),
  financialType: z.enum(FINANCIAL_TYPES).catch('receber'),
  settled: z.boolean().catch(false),
  category: z.string().catch(''),
});
const rawReply = z.object({
  reply: z.string().trim().min(1).max(4000),
  proposals: z.array(z.unknown()).catch([]),
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
  /** Rótulos de informações obrigatórias que o gestor não informou. */
  missing: string[];
}
/** Transformar uma demanda em caso. A demanda pode já existir (demandId) ou estar proposta na mesma resposta. */
export interface CaseProposal {
  kind: 'case';
  demandId: string;
  demandTitle: string;
  client: string;
  customValues: Record<string, string | number>;
  missing: string[];
}
export interface FinancialProposal {
  kind: 'financial';
  type: (typeof FINANCIAL_TYPES)[number];
  description: string;
  clientOrSupplier: string;
  amount: number;
  dueDate: string;
  settled: boolean;
  category: string;
  /** Caso já existente, quando a IA apontou um id válido. */
  projectId: string;
  /** Nome do caso a vincular quando ele ainda será criado nesta mesma resposta. */
  caseName: string;
  missing: string[];
}
export type Proposal = ClientProposal | DemandProposal | CaseProposal | FinancialProposal;

/** O que o módulo precisa conhecer do escritório para conferir referências. */
export interface OfficeRecords {
  clients: { name: string }[];
  demands: { id: string; title: string; client: string; status: string; projectId?: string }[];
  projects: { id: string; name: string; client: string }[];
}

const clean = (value: string, max: number) => value.trim().slice(0, max);
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const isDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
};
const money = (value: number) => {
  const rounded = Math.round(Math.max(0, Math.min(value, 999_999_999)) * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
};

function customValuesFor(
  raw: { fieldId: string; value: string }[],
  config: Configuration,
  entity: 'demand' | 'project',
) {
  const fields = config.fields.filter((f) => f.entity === entity);
  const values: Record<string, string | number> = {};
  for (const { fieldId, value } of raw) {
    const field = fields.find((f) => f.id === fieldId);
    const trimmed = value.trim();
    if (!field || !trimmed) continue;
    if (field.type === 'number') {
      const n = Number(trimmed.replace(',', '.'));
      if (Number.isFinite(n)) values[field.id] = n;
    } else if (field.type === 'select') {
      const option = field.options.find((o) => same(o, trimmed));
      if (option) values[field.id] = option;
    } else {
      values[field.id] = trimmed.slice(0, 2000);
    }
  }
  const missing = fields.filter((f) => f.required && values[f.id] === undefined).map((f) => f.label);
  return { values, missing };
}

/**
 * Converte a resposta crua da IA em propostas seguras, na ordem em que podem ser gravadas:
 * clientes, demandas, casos, lançamentos. Tudo o que não bate com a configuração ou com os
 * registros do escritório é descartado aqui; o que sobra ainda passa pela validação completa
 * na hora de gravar.
 */
export function parseChatReply(
  text: string,
  config: Configuration | null,
  office: OfficeRecords,
): { reply: string; proposals: Proposal[] } {
  const parsed = rawReply.parse(JSON.parse(text));
  // Sem escritório configurado não existe onde cadastrar.
  if (!config) return { reply: parsed.reply, proposals: [] };

  const raws = parsed.proposals.flatMap((item) => {
    const r = rawProposal.safeParse(item);
    return r.success ? [r.data] : [];
  });

  const clients: ClientProposal[] = [];
  const demands: DemandProposal[] = [];
  const cases: CaseProposal[] = [];
  const financial: FinancialProposal[] = [];

  for (const raw of raws.filter((r) => r.kind === 'client')) {
    const name = clean(raw.clientName, 200);
    if (!name) continue;
    if (office.clients.some((c) => same(c.name, name)) || clients.some((c) => same(c.name, name))) continue;
    const email = clean(raw.email, 250);
    clients.push({ kind: 'client', name, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '' });
  }

  for (const raw of raws.filter((r) => r.kind === 'demand')) {
    const title = clean(raw.title, 200);
    const client = clean(raw.clientName, 200);
    if (!title || !client) continue;
    const { values, missing } = customValuesFor(raw.customValues, config, 'demand');
    demands.push({
      kind: 'demand',
      title,
      client,
      service: config.services.find((s) => same(s, raw.service)) ?? '',
      responsible: clean(raw.responsible, 200),
      priority: raw.priority,
      dueDate: isDate(raw.dueDate) ? raw.dueDate : '',
      estimatedValue: money(raw.amount),
      description: clean(raw.description, 8000),
      customValues: values,
      missing,
    });
  }

  for (const raw of raws.filter((r) => r.kind === 'case')) {
    const byId = office.demands.find((d) => d.id === raw.demandId);
    const title = clean(raw.title, 200);
    const existing = byId ?? office.demands.find((d) => title && same(d.title, title));
    const proposed = existing ? undefined : demands.find((d) => title && same(d.title, title));
    if (!existing && !proposed) continue;
    // Demanda já convertida ou cancelada não vira caso de novo.
    if (existing && (existing.projectId || ['convertida', 'cancelada'].includes(existing.status))) continue;
    const demandTitle = existing?.title ?? proposed!.title;
    if (cases.some((c) => same(c.demandTitle, demandTitle))) continue;
    const { values, missing } = customValuesFor(raw.customValues, config, 'project');
    cases.push({
      kind: 'case',
      demandId: existing?.id ?? '',
      demandTitle,
      client: existing?.client ?? proposed!.client,
      customValues: values,
      missing,
    });
  }

  for (const raw of raws.filter((r) => r.kind === 'financial')) {
    const description = clean(raw.title, 200);
    if (!description) continue;
    const amount = money(raw.amount);
    const dueDate = isDate(raw.dueDate) ? raw.dueDate : '';
    const clientOrSupplier = clean(raw.clientName, 200);
    const project = office.projects.find((p) => p.id === raw.projectId);
    // O caso pode ainda não existir: aceita o nome se houver caso proposto ou existente com esse nome.
    const wanted = clean(raw.description, 200);
    const byName =
      project ??
      office.projects.find((p) => wanted && same(p.name, wanted));
    const pendingCase = byName ? undefined : cases.find((c) => wanted && same(c.demandTitle, wanted));
    const missing = [
      ...(amount > 0 ? [] : ['Valor']),
      ...(dueDate ? [] : ['Vencimento']),
      ...(clientOrSupplier ? [] : ['Cliente ou fornecedor']),
    ];
    financial.push({
      kind: 'financial',
      type: raw.financialType,
      description,
      clientOrSupplier,
      amount,
      dueDate,
      settled: raw.settled,
      category: clean(raw.category, 200) || (raw.financialType === 'receber' ? 'Honorários' : 'Despesa'),
      projectId: byName?.id ?? '',
      caseName: byName?.name ?? pendingCase?.demandTitle ?? '',
      missing,
    });
  }

  const proposals: Proposal[] = [...clients, ...demands, ...cases, ...financial].slice(0, MAX_PROPOSALS);
  return { reply: parsed.reply, proposals };
}

export const PROPOSAL_RULES = `
Responda SEMPRE no formato JSON pedido. "reply" é o texto para o gestor, em até 6 frases.

VOCÊ PREPARA QUATRO TIPOS DE PROPOSTA, e só estes: cadastrar cliente, cadastrar demanda, transformar uma demanda em caso, e registrar um lançamento financeiro. Você NÃO grava nada: o gestor confirma cada proposta na tela. No reply, diga que são propostas aguardando confirmação. Nunca diga que salvou, cadastrou, criou, lançou ou converteu.
Se não houver pedido de cadastro, "proposals" é uma lista vazia.
Use somente o que o gestor escreveu ou o que está em context. Campo não informado fica vazio: texto "", número 0, data "", settled false. Não invente e-mail, prazo, valor, responsável nem cliente.
Nunca peça informação que o sistema não guarda (forma de pagamento, data de emissão, responsável financeiro, número de processo). Se faltar algo obrigatório, monte a proposta com o que há: a tela avisa o gestor do que falta.
Para pedidos fora dos quatro tipos (criar caso sem demanda, editar ou excluir registros, criar tarefas, mudar configuração), diga em uma frase que isso não é feito pelo chat e indique a tela: Casos, Demandas, Clientes, Financeiro ou Configuração do escritório. Não prometa preparar algo que não está nos quatro tipos.

kind "client": preencha clientName e, se informado, email. Não proponha cliente que já está em context.clients.
kind "demand": clientName é o cliente; title é o nome curto do pedido; service deve ser exatamente um dos context.configuration.services ou ""; responsible é quem executa; priority é urgente, alta, media ou baixa (use media se não informado); dueDate AAAA-MM-DD ou ""; amount são os honorários estimados. customValues só aceita fieldId de context.configuration.demandFields.
kind "case": transforma UMA demanda em caso. Se a demanda já existe em context.demands, preencha demandId com o id dela e title com o título dela. Se a demanda está sendo proposta nesta mesma resposta, deixe demandId "" e repita em title exatamente o title da demanda proposta. customValues só aceita fieldId de context.configuration.caseFields. Confirmar esta proposta aprova a demanda.
kind "financial": title é a descrição do lançamento; financialType é receber ou pagar; clientName é o cliente ou fornecedor; amount é o valor, maior que zero; dueDate é o vencimento AAAA-MM-DD (calcule a partir de context.today quando o gestor disser "em 30 dias" ou "dia 10"); settled true somente se o gestor disser que já foi recebido ou pago; category é curta, como Mensalidade, Êxito, Honorários ou Despesa. Para vincular a um caso: se o caso existe em context.projects, preencha projectId com o id; se o caso será criado nesta mesma resposta, deixe projectId "" e escreva em description exatamente o title da demanda que vira caso. Sem vínculo, deixe os dois vazios.
Honorários estimados de uma demanda não são lançamento financeiro: só proponha kind "financial" quando o gestor pedir um lançamento, conta a receber, conta a pagar, cobrança ou pagamento.
Em campo do tipo select use exatamente uma das options. No máximo 10 propostas por resposta; se o pedido tiver mais, proponha as 10 primeiras e avise no reply.`;
