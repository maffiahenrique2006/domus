# Relatório de publicação e medição de tokens — Domus System (MVP acadêmico)

**Data/hora da entrega:** 2026-09-11, 11:45 (America/Sao_Paulo)
**Repositório:** https://github.com/maffiahenrique2006/domus
**Branch final:** `mvp/openai-integration-e-correcoes` (mesclada em `main`)
**Commit final:** ver seção "Commit final" abaixo (preenchido após o push)

---

## 0. Contexto e limitação importante desta entrega

Este trabalho foi conduzido **sem acesso ao Replit**: o acesso à conta/workspace do Replit foi perdido durante a sessão, antes de qualquer inspeção ser feita por lá. Isso muda o escopo do que pôde ser concluído:

- **Feito 100% a partir do GitHub**: clonagem do repositório, inspeção do código real, correção de bugs, implementação da integração real com a OpenAI, medição de tokens, testes locais (typecheck, build, runtime em produção com Postgres local), documentação, commit e push.
- **Não verificável sem o Replit** (ficam pendentes para quando o acesso for restabelecido):
  - Presença/nome dos Secrets configurados na conta Replit (`OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_URL`, etc.) — só quem loga no Replit consegue ver isso.
  - Publicação real (deploy) no Replit e teste da URL pública.
  - Uma chamada real à OpenAI com uma chave de produção — nenhuma chave foi usada, pedida ou colada nesta sessão, conforme instrução explícita de nunca solicitar segredos no chat.
- A única versão do projeto disponível para este trabalho foi `origin/main` no commit `08e1b18b1bbcc95558e8434fb88c3c0908bd8ccc` — a mesma versão antiga mencionada no pedido original, sem integração real com a OpenAI. Qualquer alteração feita exclusivamente dentro do Replit (ex.: a configuração da chave da OpenAI) e nunca enviada ao GitHub **não pôde ser recuperada** — esse trabalho, se existia, foi perdido junto com o acesso à conta.

---

## 1. O que foi corrigido/implementado

### 1.1 Domus AI — integração real com a OpenAI (Etapa 4)

- Novo módulo `artifacts/api-server/src/lib/domus-ai.ts`: usa o SDK oficial `openai` (pacote `openai`, Responses API — `client.responses.create`), lê a chave exclusivamente de `process.env.OPENAI_API_KEY` e o modelo exclusivamente de `process.env.OPENAI_MODEL` (nunca troca o modelo configurado por outro), usa `response.output_text` para extrair a resposta, define `max_output_tokens: 500` e `store: false`.
- Prompt de sistema dá contexto da Vértice Espaços (escritório fictício) e instrui respostas em português, curtas e sem inventar dados que a IA não recebeu.
- `artifacts/api-server/src/lib/openai-client.ts`: cliente OpenAI construído sob demanda; nunca instanciado sem a chave.
- `artifacts/api-server/src/lib/domus-ai-errors.ts`: erros tipados (`MissingApiKeyError`, `MissingModelError`, `AiRateLimitedError`, `AiUnavailableError`) para mapear falhas em respostas HTTP claras, **sem vazar detalhes internos** (`chat.ts` nunca repassa a mensagem de erro da OpenAI ao navegador).
- `artifacts/api-server/src/routes/chat.ts`: reescrito — removida a função `buildDomusResponse` (respostas fixas por palavra-chave); a rota `POST /api/chat/messages` agora chama `askDomusAi`, salva a resposta real no banco e devolve `{ message, usage }`.
- Frontend (`artifacts/domus/src/pages/domus-ai.tsx`): removido o `setTimeout` com resposta simulada; a página agora faz `fetch("/api/chat/messages", { method: "POST", ... })` de verdade. Não existe nenhuma chamada direta do navegador para a OpenAI — a chave nunca é exposta ao cliente.

### 1.2 Medição de tokens (Etapa 5)

- Cada chamada bem-sucedida devolve `usage: { model, responseId, inputTokens, outputTokens, totalTokens }` — valores vindos diretamente do campo `usage` da resposta da OpenAI, nunca estimados.
- Servidor: `artifacts/api-server/src/lib/ai-usage-log.ts` grava um log estruturado (`event: "domus_ai_usage"`) por chamada, com modelo, tokens, `responseId`, identificador de sessão da demonstração e timestamp — **sem o conteúdo das mensagens**.
- Frontend: painel discreto **"Uso desta sessão"** no topo da página Domus AI, mostrando chamadas, tokens de entrada, de saída e total (persistidos em `sessionStorage`, por aba). Botão **"Zerar medição da sessão"** zera apenas esse contador local — não apaga mensagens nem dados do banco.
- Navegar pelos módulos Visão Geral, Demandas, Projetos e Financeiro **não gera nenhuma chamada à OpenAI** — são dados locais mockados no frontend, como já eram antes.

### 1.3 Bugs confirmados e corrigidos (Etapa 3 e 6)

| # | Problema relatado | Confirmado no código? | Correção |
|---|---|---|---|
| 1 | `chat.ts` com respostas fixas, sem chamar a OpenAI | **Sim** | Reescrito para chamar a OpenAI de verdade (seção 1.1) |
| 2 | `domus-ai.tsx` com `setTimeout` e resposta simulada | **Sim** | Removido; chamada real ao backend (seção 1.1) |
| 3 | Falta `.env.example`, embora o README mande copiá-lo | **Sim** | Criado `.env.example` na raiz |
| 4 | README afirma que não há serviços externos | **Sim** | Atualizado — Domus AI agora declarada como dependente da OpenAI |
| 5 | Typecheck com erro de datas em `demands.ts` e `financial.ts` | **Sim, confirmado rodando `pnpm run typecheck`** | As colunas `dueDate`/`date` são `date` no Postgres (Drizzle `mode: "string"`), mas o Zod gerado (`zod.coerce.date()`) produz `Date`. Criado `artifacts/api-server/src/lib/dates.ts` (`dateToDateString`) e aplicado nas rotas de criação/atualização antes de gravar no banco. |
| 6 | `pnpm-workspace.yaml` excluiria pacotes nativos necessários ao Rollup no ambiente do Replit | **Não confirmado — parece já correto.** As exclusões atuais cobrem apenas plataformas *fora* de `linux-x64` (ex.: `darwin-arm64`, `linux-x64-musl`), preservando `rollup-linux-x64-gnu`, que é o que o Replit usa. Não alterado; documentado aqui para quem revisar. |
| 7 | Frontend e API precisam ser publicados no mesmo endereço | **Sim, confirmado** — `app.ts` só montava `/api`, sem servir o frontend | Adicionado `express.static` + fallback SPA (sem interceptar `/api`) em `artifacts/api-server/src/app.ts`, ativo apenas quando `NODE_ENV=production` |

### 1.4 Outras correções necessárias para o build passar (Etapa 6)

- **Lockfile inexistente**: o repositório nunca teve um `pnpm-lock.yaml` commitado — cada `pnpm install` podia resolver versões diferentes, o que não é reprodutível. Gerado e commitado `pnpm-lock.yaml` (validado com `pnpm install --frozen-lockfile`).
- **`lib/api-client-react/tsconfig.json`**: faltava `"dom.iterable"` no `lib` do TypeScript, o que quebrava o typecheck do cliente gerado (`Headers.entries()` não tipado). Corrigido.
- **`artifacts/domus-ds/src/preview/foundations.tsx`**: três chamadas ao componente `<Guidelines>` usavam props `dos`/`donts` que não existem na assinatura do componente (`items: {kind, text}[]`) — erro de typecheck pré-existente, sem relação com a IA, mas bloqueava `pnpm run build` (que roda typecheck em todo o workspace). Corrigido convertendo as chamadas para o formato `items`.
- **Servidor de erro / 404 da API**: adicionado handler de erro final e 404 para `/api/*` que nunca vaza stack trace ou detalhes internos.
- **`app.set("trust proxy", true)`**: necessário para o limitador de taxa identificar o IP real do cliente atrás do proxy do Replit.
- **`.replit`**: a seção `[deployment]` não tinha `build` nem `run` — sem isso, o Replit não saberia como buildar nem iniciar o app em produção. Adicionados ambos (ver seção 4).

### 1.5 Proteção contra uso indevido (Etapa 6)

- Limite de tamanho de mensagem: 2000 caracteres (`ChatMessageInput.content`, validado por Zod — testado, ver seção 3).
- Limite de saída da OpenAI: `max_output_tokens: 500`.
- Limite de frequência: 12 chamadas por IP a cada 60 segundos (`artifacts/api-server/src/middlewares/rate-limit.ts`, em memória — suficiente para uma demonstração de MVP de faculdade, não para produção multi-instância).
- Modelo fixado pelo ambiente (`OPENAI_MODEL`), nunca escolhido pelo cliente.
- Erros sempre com mensagem genérica em português — nunca a mensagem de erro original da OpenAI, stack trace, ou valor de secret.

### 1.6 Documentação (Etapa 7)

- `.env.example` criado na raiz com `OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_URL`, `SESSION_SECRET`, `PORT`, `BASE_PATH`, `NODE_ENV` — todos vazios/sem valores reais.
- `README.md` atualizado: o que é o MVP acadêmico, o que é real vs. demonstrativo, como rodar, como configurar Secrets no Replit, como publicar, como medir tokens, e que a chave nunca pode ir para o frontend ou GitHub.

---

## 2. Secrets exigidos (apenas nomes — nenhum valor foi visto, pedido ou registrado)

| Secret | Exigido por | Situação no Replit |
|---|---|---|
| `OPENAI_API_KEY` | Domus AI (obrigatório para respostas reais) | **Não verificável** — sem acesso ao Replit nesta sessão |
| `OPENAI_MODEL` | Domus AI (obrigatório) | **Não verificável** |
| `DATABASE_URL` | Toda a aplicação (demandas, financeiro, chat) | **Não verificável** — normalmente provisionado automaticamente pelo módulo `postgresql-16` do Replit |
| `SESSION_SECRET` | Só se sessão estiver habilitada (não está sendo usada no código atual) | Não aplicável no momento |

Nenhum destes valores foi exibido, copiado, registrado em log ou solicitado ao dono da conta durante este trabalho.

---

## 3. Testes executados e resultados

Todos os testes abaixo foram rodados localmente (macOS, fora do Replit), com um Postgres 18 temporário criado só para o teste e um servidor Node em modo produção apontando para ele. Nenhuma chave da OpenAI foi usada.

| Teste | Comando/ação | Resultado |
|---|---|---|
| Instalação limpa | `pnpm install --frozen-lockfile` | ✅ OK, lockfile reproduzível |
| Typecheck completo | `pnpm run typecheck` | ✅ Todos os 5 pacotes passam (`api-server`, `domus`, `domus-ds`, `mockup-sandbox`, `scripts`) |
| Build completo | `pnpm run build` (frontend + API) | ✅ `artifacts/domus/dist/public`, `artifacts/domus-ds/dist`, `artifacts/mockup-sandbox/dist`, `artifacts/api-server/dist/index.mjs` gerados |
| `git diff --check` | — | ✅ Sem problemas de whitespace |
| Segredo no diff/histórico | `grep` por padrões de chave/senha no diff | ✅ Nenhum encontrado |
| Início em modo produção | `NODE_ENV=production PORT=5050 DATABASE_URL=... node dist/index.mjs` | ✅ Sobe e escuta na porta informada |
| Endpoint de saúde | `GET /api/healthz` | ✅ `200 {"status":"ok"}` |
| Frontend servido pela mesma origem | `GET /` | ✅ `200`, `index.html` do build |
| Navegação direta por URL (fallback SPA) | `GET /demandas` | ✅ `200`, sem interceptar `/api` |
| Rota `/api` inexistente | `GET /api/nao-existe` | ✅ `404 {"error":"Rota não encontrada."}` |
| Rota de demandas (com a correção de data) | `POST` e `PATCH /api/demands` com `dueDate` | ✅ `201`/`200`, data persistida e devolvida corretamente |
| Rota financeira (com a correção de data) | `POST /api/financial/transactions` com `date` | ✅ `201`, valor e data persistidos corretamente |
| Domus AI sem `OPENAI_API_KEY` | `POST /api/chat/messages` sem a variável definida | ✅ `503`, mensagem clara em português, sem detalhes internos no corpo nem no log |
| Limite de tamanho da mensagem | `POST` com 2001 caracteres | ✅ `400 {"error":"Mensagem inválida."}` |
| Limite de frequência | 15 chamadas seguidas ao chat | ✅ Após o limite (12/60s por IP), passa a devolver `429` |
| Chamada real da Domus AI + tokens > 0 | — | ⚠️ **Não executado** — exigiria uma `OPENAI_API_KEY` real, que não foi pedida nem usada nesta sessão (ver seção 6) |
| Testes automatizados existentes | procurado por scripts de teste no monorepo | Não há suíte de testes (`test`) configurada nos `package.json` deste projeto — nada para rodar além do typecheck/build acima |

---

## 4. Configuração de publicação no `.replit`

```toml
[deployment]
router = "application"
deploymentTarget = "autoscale"
build = ["sh", "-c", "export PORT=5000 BASE_PATH=/ NODE_ENV=production; pnpm install --frozen-lockfile && pnpm run build"]
run = ["sh", "-c", "NODE_ENV=production pnpm --filter @workspace/api-server run start"]
```

Isso não pôde ser testado num deploy real do Replit (sem acesso à conta). A sintaxe segue o formato padrão de `.replit` (`build`/`run` como array de comando), mas **deve ser conferida na aba Deployments do Replit antes de publicar**, já que não houve como validar contra o ambiente real.

---

## 5. Modelo da OpenAI utilizado

Não fixado no código — lido de `process.env.OPENAI_MODEL`, conforme exigido (Etapa 4: "não trocar silenciosamente um modelo já configurado"). Quem configurar o Secret no Replit decide o modelo (ex.: `gpt-4.1-mini`). Nenhuma chamada real foi feita nesta sessão, então nenhum modelo específico foi exercitado de fato.

---

## 6. Tokens medidos no teste desta entrega

**Chamadas realizadas à OpenAI nesta sessão: 0.**
Entrada: 0 · Saída: 0 · Total: 0.

Não foi feita nenhuma chamada real à OpenAI porque:
1. Nenhuma `OPENAI_API_KEY` foi fornecida, pedida ou colada nesta sessão (instrução explícita do pedido original).
2. O Replit — onde os Secrets desta conta estão configurados — ficou inacessível durante o trabalho.

O que **foi** verificado é o caminho completo até a chamada: o servidor monta a requisição corretamente para `client.responses.create`, e o tratamento de erro por ausência de chave devolve `503` de forma limpa (testado, seção 3). Assim que os Secrets estiverem configurados (no Replit ou localmente), a primeira pergunta real na Domus AI deve gerar `usage.totalTokens > 0` — isso fica como verificação pendente para quem tiver acesso à chave.

---

## 7. Como zerar e medir uma nova gravação

1. Abra a página **Domus AI** e clique em **"Zerar medição da sessão"** — zera só o contador do navegador (chamadas/tokens exibidos), sem apagar mensagens do histórico nem dados do banco.
2. Comece a gravação de tela e use o sistema normalmente, fazendo as perguntas planejadas para a Domus AI.
3. Ao final, copie os números mostrados em **"Uso desta sessão"** (chamadas, tokens de entrada, de saída, total).

Navegar por Visão Geral, Demandas, Projetos e Financeiro não altera esse contador — só chamadas reais à Domus AI entram nele. Tokens usados pelo Claude/Replit para *desenvolver* este software não aparecem em lugar nenhum da aplicação — são completamente separados.

---

## 8. Pendências (dependem de acesso ao Replit / a uma chave real)

1. **Confirmar os Secrets no Replit** (`OPENAI_API_KEY`, `OPENAI_MODEL`, `DATABASE_URL`) — apenas quem tem acesso à conta consegue ver isso.
2. **Publicar de fato no Replit** e abrir a URL pública — não foi possível nesta sessão.
3. **Rodar uma pergunta real na Domus AI publicada** e confirmar `usage.totalTokens > 0` com a chave de produção.
4. **Conferir a sintaxe `build`/`run` do `.replit`** contra o painel de Deployments do Replit antes de publicar (não pôde ser validada contra o ambiente real).
5. Verificar se algum trabalho feito exclusivamente dentro do Replit (fora do Git) — por exemplo, a configuração da chave da OpenAI mencionada no pedido original, ou uma eventual integração já iniciada lá — foi perdido com a queda de acesso à conta. Se o acesso for recuperado, vale conferir o histórico/checkpoints do Replit antes de sobrescrever qualquer coisa.

---

## 9. Confirmação de segurança

- Nenhum valor de `OPENAI_API_KEY`, `DATABASE_URL`, `SESSION_SECRET` ou qualquer outro segredo foi exibido, solicitado, digitado ou commitado nesta sessão.
- `git diff` da entrega foi revisado à procura de padrões de chave/senha — nenhum encontrado (seção 3).
- `.env.example` contém apenas nomes de variáveis, sem valores.
- Logs do servidor (testados em produção local) registram apenas metadados (modelo, contagem de tokens, id da resposta, id de sessão) — nunca o conteúdo das mensagens nem segredos.
