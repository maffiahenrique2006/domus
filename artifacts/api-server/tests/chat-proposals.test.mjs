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
const base = { clientName: '', email: '', title: '', service: '', responsible: '', priority: 'media', dueDate: '', estimatedValue: 0, description: '', customValues: [] };
const reply = (proposals) => JSON.stringify({ reply: 'Propostas prontas para confirmação.', proposals });

before(async () => {
  temp = await mkdtemp(path.join(root, 'artifacts/api-server/.chat-proposals-tests-'));
  const outfile = path.join(temp, 'chat-proposals.mjs');
  await build({ entryPoints: [path.join(root, 'artifacts/api-server/src/lib/chat-proposals.ts')], outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', logLevel: 'silent' });
  ({ parseChatReply, chatReplyJsonSchema } = await import(pathToFileURL(outfile).href));
});
after(async () => { await rm(temp, { recursive: true, force: true }); });

test('sem pedido de cadastro não há propostas', () => {
  const r = parseChatReply(reply([]), config, []);
  assert.equal(r.proposals.length, 0);
  assert.equal(r.reply, 'Propostas prontas para confirmação.');
});

test('cliente novo é proposto; cliente existente ou repetido é descartado', () => {
  const r = parseChatReply(reply([
    { ...base, kind: 'client', clientName: 'Cliente X', email: 'x@example.invalid' },
    { ...base, kind: 'client', clientName: 'cliente x' },
    { ...base, kind: 'client', clientName: 'Já Existe Ltda' },
  ]), config, [{ name: 'já existe ltda' }]);
  assert.deepEqual(r.proposals, [{ kind: 'client', name: 'Cliente X', email: 'x@example.invalid' }]);
});

test('e-mail inválido vira vazio em vez de derrubar a proposta', () => {
  const r = parseChatReply(reply([{ ...base, kind: 'client', clientName: 'Cliente Y', email: 'não é e-mail' }]), config, []);
  assert.equal(r.proposals[0].email, '');
});

test('demanda válida mantém serviço, campos personalizados e valor', () => {
  const r = parseChatReply(reply([{ ...base, kind: 'demand', clientName: 'Cliente X', title: 'Aquisição da empresa Y', service: 'm&a', responsible: 'Mike', priority: 'alta', dueDate: '2026-11-30', estimatedValue: 150000.456,
    customValues: [{ fieldId: 'recorrente', value: 'não' }, { fieldId: 'revisor', value: 'Harvey' }] }]), config, []);
  const d = r.proposals[0];
  assert.equal(d.service, 'M&A');
  assert.equal(d.estimatedValue, 150000.46);
  assert.equal(d.dueDate, '2026-11-30');
  assert.deepEqual(d.customValues, { recorrente: 'Não', revisor: 'Harvey' });
  assert.deepEqual(d.missing, []);
});

test('o que não bate com a configuração é descartado, e o obrigatório que falta é nomeado', () => {
  const r = parseChatReply(reply([{ ...base, kind: 'demand', clientName: 'Cliente X', title: 'Treinamento', service: 'Trabalhista', dueDate: '30/11/2026', estimatedValue: -5,
    customValues: [{ fieldId: 'recorrente', value: 'Talvez' }, { fieldId: 'inventado', value: 'x' }, { fieldId: 'honorario', value: 'Êxito' }] }]), config, []);
  const d = r.proposals[0];
  assert.equal(d.service, '');
  assert.equal(d.dueDate, '');
  assert.equal(d.estimatedValue, 0);
  assert.deepEqual(d.customValues, {});
  assert.deepEqual(d.missing, ['Recorrente']);
});

test('demanda sem título ou sem cliente é descartada', () => {
  const r = parseChatReply(reply([{ ...base, kind: 'demand', clientName: 'Cliente X' }, { ...base, kind: 'demand', title: 'Sem cliente' }]), config, []);
  assert.equal(r.proposals.length, 0);
});

test('no máximo 8 propostas por resposta', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ ...base, kind: 'client', clientName: `Cliente ${i}` }));
  assert.equal(parseChatReply(reply(many), config, []).proposals.length, 8);
});

test('escritório sem configuração não recebe propostas', () => {
  const r = parseChatReply(reply([{ ...base, kind: 'client', clientName: 'Cliente X' }]), null, []);
  assert.equal(r.proposals.length, 0);
});

test('resposta que não é JSON ou vem sem reply é erro', () => {
  assert.throws(() => parseChatReply('texto solto', config, []));
  assert.throws(() => parseChatReply(JSON.stringify({ proposals: [] }), config, []));
});

test('o schema enviado à OpenAI é estrito em todos os níveis', () => {
  const check = (node) => {
    if (node?.type === 'object') { assert.equal(node.additionalProperties, false); assert.deepEqual(node.required, Object.keys(node.properties)); Object.values(node.properties).forEach(check); }
    if (node?.type === 'array') check(node.items);
  };
  check(chatReplyJsonSchema);
});
