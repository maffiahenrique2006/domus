// Cadastro por conversa: a IA PROPÕE; ela nunca grava.
// Cobre cinco gestos: cliente, demanda, caso (a partir de demanda ou do zero), tarefa e lançamento financeiro.
// Este módulo define o formato que a IA devolve e limpa cada proposta contra a
// configuração e os registros do escritório. A gravação acontece depois, quando o
// gestor confirma na tela, pela mesma rota /workspace/actions usada pelos formulários.
import { z } from 'zod/v4';
import type { Configuration } from './workspace-validation';

const MAX_PROPOSALS = 12;
const PRIORITIES = ['urgente', 'alta', 'media', 'baixa'] as const;
const KINDS = ['client', 'demand', 'case', 'task', 'financial'] as const;
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
      caseName: string,
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
  caseName: z.string().catch(''),
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
/**
 * Criar um caso. fromDemand true: transforma uma demanda em caso; ela pode já existir (demandId)
 * ou estar proposta na mesma resposta (mesmo nome). fromDemand false: caso criado do zero.
 */
export interface CaseProposal {
  kind: 'case';
  fromDemand: boolean;
  demandId: string;
  name: string;
  client: string;
  service: string;
  responsible: string;
  dueDate: string;
  budget: number;
  description: string;
  customValues: Record<string, string | number>;
  missing: string[];
}
export interface TaskProposal {
  kind: 'task';
  title: string;
  description: string;
  responsible: string;
  dueDate: string;
  /** Caso já existente, quando a IA apontou um id ou nome válido. */
  projectId: string;
  /** Nome do caso: existente ou a ser criado nesta mesma resposta. */
  caseName: string;
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
export type Proposal = ClientProposal | DemandProposal | CaseProposal | TaskProposal | FinancialProposal;

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
 * clientes, demandas, casos, tarefas, lançamentos. Tudo o que não bate com a configuração ou com os
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
  const tasks: TaskProposal[] = [];
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
    // Demanda já convertida ou cancelada não vira caso de novo.
    if (existing && (existing.projectId || ['convertida', 'cancelada'].includes(existing.status))) continue;
    const name = existing?.title ?? proposed?.title ?? title;
    const client = existing?.client ?? proposed?.client ?? clean(raw.clientName, 200);
    if (!name || !client) continue;
    if (cases.some((c) => same(c.name, name)) || office.projects.some((p) => same(p.name, name))) continue;
    const { values, missing } = customValuesFor(raw.customValues, config, 'project');
    const fromDemand = Boolean(existing || proposed);
    cases.push({
      kind: 'case',
      fromDemand,
      demandId: existing?.id ?? '',
      name,
      client,
      // Na conversão, estes dados vêm da demanda; aqui só valem para caso criado do zero.
      service: fromDemand ? '' : (config.services.find((s) => same(s, raw.service)) ?? ''),
      responsible: fromDemand ? '' : clean(raw.responsible, 200),
      dueDate: fromDemand ? '' : isDate(raw.dueDate) ? raw.dueDate : '',
      budget: fromDemand ? 0 : money(raw.amount),
      description: fromDemand ? '' : clean(raw.description, 8000),
      customValues: values,
      missing,
    });
  }

  // Caso de destino de tarefa ou lançamento: existente (id ou nome) ou proposto nesta resposta.
  const resolveCase = (projectId: string, caseName: string) => {
    const wanted = clean(caseName, 200);
    const project =
      office.projects.find((p) => p.id === projectId) ??
      office.projects.find((p) => wanted && same(p.name, wanted));
    if (project) return { projectId: project.id, caseName: project.name };
    const pending = cases.find((c) => wanted && same(c.name, wanted));
    return pending ? { projectId: '', caseName: pending.name } : null;
  };

  for (const raw of raws.filter((r) => r.kind === 'task')) {
    const title = clean(raw.title, 200);
    const target = resolveCase(raw.projectId, raw.caseName);
    // Tarefa sempre pertence a um caso; sem caso identificado, não há onde gravar.
    if (!title || !target) continue;
    if (tasks.some((t) => same(t.title, title) && same(t.caseName, target.caseName))) continue;
    tasks.push({
      kind: 'task',
      title,
      description: clean(raw.description, 4000),
      responsible: clean(raw.responsible, 200),
      dueDate: isDate(raw.dueDate) ? raw.dueDate : '',
      ...target,
    });
  }

  for (const raw of raws.filter((r) => r.kind === 'financial')) {
    const description = clean(raw.title, 200);
    if (!description) continue;
    const amount = money(raw.amount);
    const dueDate = isDate(raw.dueDate) ? raw.dueDate : '';
    const clientOrSupplier = clean(raw.clientName, 200);
    const target = resolveCase(raw.projectId, raw.caseName);
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
      projectId: target?.projectId ?? '',
      caseName: target?.caseName ?? '',
      missing,
    });
  }

  const proposals: Proposal[] = [...clients, ...demands, ...cases, ...tasks, ...financial].slice(0, MAX_PROPOSALS);
  return { reply: parsed.reply, proposals };
}

export const PROPOSAL_RULES = `
Responda SEMPRE no formato JSON pedido. "reply" é o texto para o gestor, em até 6 frases.

VOCÊ PREPARA CINCO TIPOS DE PROPOSTA, e só estes: cadastrar cliente, cadastrar demanda, criar caso, criar tarefa em um caso e registrar lançamento financeiro. Você NÃO grava nada: o gestor confirma cada proposta na tela. No reply, diga que são propostas aguardando confirmação e que depois ele pode abrir e editar cada registro na tela. Nunca diga que salvou, cadastrou, criou, lançou ou converteu.
Se não houver pedido de cadastro, "proposals" é uma lista vazia.
Use somente o que o gestor escreveu ou o que está em context. Campo não informado fica vazio: texto "", número 0, data "", settled false. Não invente e-mail, prazo, valor, responsável nem cliente.
Nunca peça informação que o sistema não guarda (forma de pagamento, data de emissão, responsável financeiro, número de processo). Se faltar algo obrigatório, monte a proposta com o que há: a tela avisa o gestor do que falta.
Para pedidos fora dos cinco tipos (editar ou excluir registros, mover etapa, concluir tarefa, mudar configuração), diga em uma frase que isso não é feito pelo chat e indique a tela: Casos, Demandas, Clientes, Financeiro ou Configuração do escritório. Não prometa preparar algo que não está nos cinco tipos.

kind "client": preencha clientName e, se informado, email. Não proponha cliente que já está em context.clients.
kind "demand": um pedido ainda em análise. clientName é o cliente; title é o nome curto do pedido; service deve ser exatamente um dos context.configuration.services ou ""; responsible é quem executa; priority é urgente, alta, media ou baixa (use media se não informado); dueDate AAAA-MM-DD ou ""; amount são os honorários estimados; description é o detalhe. customValues só aceita fieldId de context.configuration.demandFields.
kind "case": um trabalho em execução. Há dois caminhos.
 (a) A partir de uma demanda: se ela existe em context.demands, preencha demandId com o id dela e title com o título dela; se ela está sendo proposta nesta mesma resposta, deixe demandId "" e repita em title exatamente o title da demanda proposta. Confirmar aprova a demanda.
 (b) Do zero, quando o gestor pede um caso e não há demanda: demandId "", title é o nome do caso, clientName o cliente, e preencha service, responsible, dueDate, amount (honorários previstos) e description com o que foi dito. Não crie demanda só para virar caso.
 customValues só aceita fieldId de context.configuration.caseFields. Não proponha caso com nome igual ao de um caso em context.projects.
kind "task": uma ação dentro de um caso. title é o que precisa ser feito; description é o detalhe; responsible quem faz; dueDate AAAA-MM-DD ou "". Indique o caso: projectId com o id de context.projects, ou caseName com o nome exato do caso existente ou do caso proposto nesta mesma resposta. Tarefa sem caso não existe.
kind "financial": title é a descrição do lançamento; financialType é receber ou pagar; clientName é o cliente ou fornecedor; amount é o valor, maior que zero; dueDate é o vencimento AAAA-MM-DD (calcule a partir de context.today quando o gestor disser "em 30 dias" ou "dia 10"); settled true somente se o gestor disser que já foi recebido ou pago; category é curta, como Mensalidade, Êxito, Honorários ou Despesa. Para vincular a um caso use projectId ou caseName, como na tarefa. Sem vínculo, deixe os dois vazios.
Honorários estimados ou previstos não são lançamento financeiro: só proponha kind "financial" quando o gestor pedir um lançamento, conta a receber, conta a pagar, cobrança ou pagamento.
Datas ditas como dia/mês/ano devem ser convertidas para AAAA-MM-DD. Em campo do tipo select use exatamente uma das options. No máximo 12 propostas por resposta; se o pedido tiver mais, proponha as 12 primeiras e avise no reply.`;
