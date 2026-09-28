// Cadastro por conversa: a limpeza das propostas da IA é função pura e é testada aqui.
// Nenhuma chamada externa: o texto "da IA" é escrito à mão em cada caso.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
let temp, parseChatReply, chatReplyJsonSchema;

const config = {
  companyName: 'Escritório de Teste', summary: 'Configuração usada só no teste automático.',
  briefing: { pain: 'x', intake: 'x', responsibility: 'x', financialNeeds: 'ambos' },
  services: ['M&A', 'Compliance'],
  stages: [{ id: 'triagem', label: 'Triagem' }, { id: 'fim', label: 'Concluído' }],
  fields: [
    { id: 'recorrente', label: 'Recorrente', type: 'select', entity: 'demand', required: true, options: ['Sim', 'Não'] },
    { id: 'revisor', label: 'Advogado revisor', type: 'text', entity: 'demand', required: false, options: [] },
    { id: 'honorario', label: 'Tipo de honorário', type: 'select', entity: 'project', required: false, options: ['Êxito', 'Fixo'] },
  ],
};
const empty = { clients: [], demands: [], projects: [] };
const office = {
  clients: [{ name: 'Cliente X' }],
  demands: [
    { id: 'd-nova', title: 'Aquisição da empresa Y', client: 'Cliente X', status: 'nova' },
    { id: 'd-conv', title: 'Ata anual', client: 'Cliente X', status: 'convertida', projectId: 'p-1' },
    { id: 'd-canc', title: 'Pedido cancelado', client: 'Cliente X', status: 'cancelada' },
  ],
  projects: [{ id: 'p-1', name: 'Ata anual', client: 'Cliente X' }],
};
const base = { clientName: '', email: '', title: '', service: '', responsible: '', priority: 'media', dueDate: '', amount: 0, description: '', customValues: [], demandId: '', projectId: '', caseName: '', financialType: 'receber', settled: false, category: '' };
const reply = (proposals) => JSON.stringify({ reply: 'Propostas prontas para confirmação.', proposals });
const parse = (proposals, records = empty, cfg = config) => parseChatReply(reply(proposals), cfg, records).proposals;

before(async () => {
  temp = await mkdtemp(path.join(root, 'artifacts/api-server/.chat-proposals-tests-'));
  const outfile = path.join(temp, 'chat-proposals.mjs');
  await build({ entryPoints: [path.join(root, 'artifacts/api-server/src/lib/chat-proposals.ts')], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
  ({ parseChatReply, chatReplyJsonSchema } = await import(pathToFileURL(outfile).href));
});
after(async () => { await rm(temp, { recursive: true, force: true }); });

test('sem pedido de cadastro não há propostas', () => {
  const r = parseChatReply(reply([]), config, empty);
  assert.equal(r.proposals.length, 0);
  assert.equal(r.reply, 'Propostas prontas para confirmação.');
});

test('cliente novo é proposto; cliente existente ou repetido é descartado', () => {
  const r = parse([
    { ...base, kind: 'client', clientName: 'Cliente Novo', email: 'x@example.invalid' },
    { ...base, kind: 'client', clientName: 'cliente novo' },
    { ...base, kind: 'client', clientName: 'cliente x' },
  ], office);
  assert.deepEqual(r, [{ kind: 'client', name: 'Cliente Novo', email: 'x@example.invalid' }]);
});

test('e-mail inválido vira vazio em vez de derrubar a proposta', () => {
  assert.equal(parse([{ ...base, kind: 'client', clientName: 'Cliente Y', email: 'não é e-mail' }])[0].email, '');
});

test('demanda válida mantém serviço, campos personalizados e valor', () => {
  const d = parse([{ ...base, kind: 'demand', clientName: 'Cliente X', title: 'Aquisição da empresa Y', service: 'm&a', responsible: 'Mike', priority: 'alta', dueDate: '2026-11-30', amount: 150000.456,
    customValues: [{ fieldId: 'recorrente', value: 'não' }, { fieldId: 'revisor', value: 'Harvey' }] }])[0];
  assert.equal(d.service, 'M&A');
  assert.equal(d.estimatedValue, 150000.46);
  assert.equal(d.dueDate, '2026-11-30');
  assert.deepEqual(d.customValues, { recorrente: 'Não', revisor: 'Harvey' });
  assert.deepEqual(d.missing, []);
});

test('o que não bate com a configuração é descartado, e o obrigatório que falta é nomeado', () => {
  const d = parse([{ ...base, kind: 'demand', clientName: 'Cliente X', title: 'Treinamento', service: 'Trabalhista', dueDate: '30/11/2026', amount: -5,
    customValues: [{ fieldId: 'recorrente', value: 'Talvez' }, { fieldId: 'inventado', value: 'x' }, { fieldId: 'honorario', value: 'Êxito' }] }])[0];
  assert.equal(d.service, '');
  assert.equal(d.dueDate, '');
  assert.equal(d.estimatedValue, 0);
  assert.deepEqual(d.customValues, {});
  assert.deepEqual(d.missing, ['Recorrente']);
});

test('demanda sem título ou sem cliente é descartada', () => {
  assert.equal(parse([{ ...base, kind: 'demand', clientName: 'Cliente X' }, { ...base, kind: 'demand', title: 'Sem cliente' }]).length, 0);
});

test('caso a partir de demanda existente, por id ou por título', () => {
  const byId = parse([{ ...base, kind: 'case', demandId: 'd-nova', customValues: [{ fieldId: 'honorario', value: 'êxito' }] }], office)[0];
  assert.deepEqual(byId, { kind: 'case', fromDemand: true, demandId: 'd-nova', name: 'Aquisição da empresa Y', client: 'Cliente X', service: '', responsible: '', dueDate: '', budget: 0, description: '', customValues: { honorario: 'Êxito' }, missing: [] });
  const byTitle = parse([{ ...base, kind: 'case', title: 'aquisição da empresa y' }], office)[0];
  assert.equal(byTitle.demandId, 'd-nova');
});

test('caso a partir de demanda proposta na mesma resposta fica sem id e vem depois da demanda', () => {
  const r = parse([
    { ...base, kind: 'case', title: 'Implementação da NR-1' },
    { ...base, kind: 'demand', clientName: 'Cliente Y', title: 'Implementação da NR-1', customValues: [{ fieldId: 'recorrente', value: 'Não' }] },
  ]);
  assert.deepEqual(r.map((p) => p.kind), ['demand', 'case']);
  assert.equal(r[1].demandId, '');
  assert.equal(r[1].fromDemand, true);
  assert.equal(r[1].client, 'Cliente Y');
});

test('caso do zero, sem demanda, guarda os dados informados', () => {
  const c = parse([{ ...base, kind: 'case', title: 'Defesa administrativa', clientName: 'Cliente X', service: 'compliance', responsible: 'Rachel', dueDate: '2026-11-20', amount: 30000, description: 'Resposta a notificação.' }], office)[0];
  assert.deepEqual(c, { kind: 'case', fromDemand: false, demandId: '', name: 'Defesa administrativa', client: 'Cliente X', service: 'Compliance', responsible: 'Rachel', dueDate: '2026-11-20', budget: 30000, description: 'Resposta a notificação.', customValues: {}, missing: [] });
});

test('caso do zero sem cliente, ou com nome de caso que já existe, é descartado', () => {
  assert.equal(parse([{ ...base, kind: 'case', title: 'Sem cliente' }, { ...base, kind: 'case', title: 'ata anual', clientName: 'Cliente X' }], office).length, 0);
});

test('tarefa entra em caso existente ou em caso proposto na mesma resposta; sem caso é descartada', () => {
  const r = parse([
    { ...base, kind: 'task', title: 'Levantar contratos', description: 'Últimos 5 anos.', responsible: 'Mike', dueDate: '2026-10-20', caseName: 'Aquisição da empresa Y' },
    { ...base, kind: 'task', title: 'Publicar ata', projectId: 'p-1' },
    { ...base, kind: 'task', title: 'Tarefa solta', caseName: 'Caso que não existe' },
    { ...base, kind: 'task', title: 'levantar contratos', caseName: 'aquisição da empresa y' },
    { ...base, kind: 'case', demandId: 'd-nova' },
  ], office);
  assert.deepEqual(r.map((p) => p.kind), ['case', 'task', 'task']);
  assert.deepEqual(r[1], { kind: 'task', title: 'Levantar contratos', description: 'Últimos 5 anos.', responsible: 'Mike', dueDate: '2026-10-20', projectId: '', caseName: 'Aquisição da empresa Y' });
  assert.deepEqual([r[2].projectId, r[2].caseName], ['p-1', 'Ata anual']);
});

test('caso é descartado se a demanda não existe e falta cliente, já virou caso, foi cancelada ou se repete', () => {
  assert.equal(parse([
    { ...base, kind: 'case', demandId: 'inventado', title: 'Demanda que não existe' },
    { ...base, kind: 'case', demandId: 'd-conv', clientName: 'Cliente X' },
    { ...base, kind: 'case', demandId: 'd-canc' },
  ], office).length, 0);
  assert.equal(parse([{ ...base, kind: 'case', demandId: 'd-nova' }, { ...base, kind: 'case', title: 'Aquisição da empresa Y' }], office).length, 1);
});

test('lançamento completo, com vínculo a caso existente por id ou por nome', () => {
  const f = parse([{ ...base, kind: 'financial', title: 'Honorário de êxito', clientName: 'Cliente X', amount: 150000, dueDate: '2026-12-15', category: 'Êxito', projectId: 'p-1' }], office)[0];
  assert.deepEqual(f, { kind: 'financial', type: 'receber', description: 'Honorário de êxito', clientOrSupplier: 'Cliente X', amount: 150000, dueDate: '2026-12-15', settled: false, category: 'Êxito', projectId: 'p-1', caseName: 'Ata anual', missing: [] });
  const byName = parse([{ ...base, kind: 'financial', title: 'Custas', financialType: 'pagar', clientName: 'Cartório', amount: 300, dueDate: '2026-10-10', caseName: 'ata anual', projectId: 'id-inventado' }], office)[0];
  assert.equal(byName.projectId, 'p-1');
  assert.equal(byName.category, 'Despesa');
});

test('lançamento vinculado a caso que será criado na mesma resposta guarda o nome do caso', () => {
  const r = parse([
    { ...base, kind: 'financial', title: 'Honorário de êxito M&A', clientName: 'Cliente X', amount: 150000, dueDate: '2026-12-15', caseName: 'Aquisição da empresa Y' },
    { ...base, kind: 'case', demandId: 'd-nova' },
  ], office);
  assert.deepEqual(r.map((p) => p.kind), ['case', 'financial']);
  assert.equal(r[1].projectId, '');
  assert.equal(r[1].caseName, 'Aquisição da empresa Y');
});

test('lançamento sem valor, vencimento ou cliente nomeia o que falta; já recebido é preservado', () => {
  const f = parse([{ ...base, kind: 'financial', title: 'Mensalidade', amount: 0, dueDate: 'dia 10', settled: true }])[0];
  assert.deepEqual(f.missing, ['Valor', 'Vencimento', 'Cliente ou fornecedor']);
  assert.equal(f.settled, true);
  assert.equal(f.category, 'Honorários');
  assert.equal(f.caseName, '');
});

test('proposta malformada é ignorada sem derrubar as outras', () => {
  const r = parse([{ kind: 'financial' }, 'texto', { ...base, kind: 'tarefa', title: 'x' }, { ...base, kind: 'client', clientName: 'Cliente Z' }]);
  assert.deepEqual(r.map((p) => p.kind), ['financial', 'client'].filter((k) => k === 'client'));
});

test('no máximo 12 propostas por resposta', () => {
  const many = Array.from({ length: 14 }, (_, i) => ({ ...base, kind: 'client', clientName: `Cliente ${i}` }));
  assert.equal(parse(many).length, 12);
});

test('escritório sem configuração não recebe propostas', () => {
  assert.equal(parseChatReply(reply([{ ...base, kind: 'client', clientName: 'Cliente X' }]), null, empty).proposals.length, 0);
});

test('resposta que não é JSON ou vem sem reply é erro', () => {
  assert.throws(() => parseChatReply('texto solto', config, empty));
  assert.throws(() => parseChatReply(JSON.stringify({ proposals: [] }), config, empty));
});

test('o schema enviado à OpenAI é estrito em todos os níveis', () => {
  const check = (node) => {
    if (node?.type === 'object') { assert.equal(node.additionalProperties, false); assert.deepEqual(node.required, Object.keys(node.properties)); Object.values(node.properties).forEach(check); }
    if (node?.type === 'array') check(node.items);
  };
  check(chatReplyJsonSchema);
});
