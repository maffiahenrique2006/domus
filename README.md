# Domus System — MVP acadêmico para advocacia

A Domus transforma a descrição da operação de um escritório em uma configuração de gestão revisada pelo gestor. A visão é atender negócios diversos; **esta versão implementa o recorte de escritórios de advocacia**. É independente da Domus oficial.

## Fluxo

Login Google → entrevista → revisão da configuração → clientes → demandas → casos e tarefas → financeiro → análise com IA → assinatura Stripe de teste.

A IA configura etapas e campos suportados. **Não gera um software arbitrário**, não altera o banco livremente, não calcula prazos processuais, não pesquisa processos nem presta consultoria jurídica. Use apenas informações fictícias na demonstração.

Os dados operacionais são persistidos em PostgreSQL e separados por escritório no servidor. Não há preenchimento automático com os antigos dados de arquitetura. Os antigos registros e relatórios são preservados como histórico, não como prova da versão atual.

## Stack e dados

- Interface: React, TypeScript, Vite, Tailwind, Wouter e design system existente.
- Servidor: Node.js + Express; Drizzle nas tabelas de autenticação e consultas PostgreSQL parametrizadas nos módulos novos.
- Banco: PostgreSQL relacional com chaves estrangeiras compostas por escritório, migrações versionadas e transações.
- OpenAI: Responses API no servidor, modelo obrigatório em `OPENAI_MODEL`, respostas estruturadas na entrevista, uso de tokens registrado no banco.
- Google OAuth: identidade e sessão com cookie assinado, HttpOnly e Secure em produção.
- Stripe: somente chave de teste, confirmação pelo webhook assinado, proteção contra eventos duplicados e cancelamento ao final do período.
- Vercel: interface estática e função Node para API, no mesmo domínio.

## Executar e validar

Use Node 22 e pnpm. Instale com `pnpm install --frozen-lockfile`. As variáveis estão em `.env.example` (valores devem ser preenchidos em arquivo local não versionado ou no servidor).

```sh
pnpm run typecheck
PORT=5000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/domus run build
pnpm --filter @workspace/api-server run build
# Carrega .env da raiz e aplica apenas migrações ainda não aplicadas:
node --env-file=.env lib/db/migrate.mjs
# Servidor único para API e interface construída:
node --env-file=.env artifacts/api-server/dist/index.mjs
```

Defina `APP_URL=http://localhost:5000`, `PORT=5000`, `BASE_PATH=/` e `NODE_ENV=production` para esse fluxo local. O callback local também precisa estar autorizado no Google. Não compartilhe `.env`.

## Publicação segura

1. Usar um banco de desenvolvimento/preview separado antes de produção; salvar backup do banco existente.
2. Conferir `DATABASE_URL`, `SESSION_SECRET`, `APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` e `STRIPE_WEBHOOK_SECRET` no ambiente correto.
3. Aplicar `lib/db/migrate.mjs` **antes** de publicar a nova API. Não usar `push-force` nem apagar tabelas.
4. Google: callback `${APP_URL}/api/auth/google/callback`. Stripe: webhook `${APP_URL}/api/billing/webhook`, eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`.
5. Publicar pelo projeto Vercel já ligado ao repositório. `vercel.json` gera o bundle de API a partir do código-fonte.
6. Executar o roteiro de aceitação público em [docs/demo-day.md](docs/demo-day.md). Build aprovado não prova login, IA, banco de produção ou pagamento.

## Limites desta versão

- Uma conta gerencia um escritório; convites e permissões de equipe não estão implementados. Nomes de responsáveis são dados operacionais, não contas com acesso.
- Free: até 10 tentativas de IA por dia/escritório; Pro de teste: 100. O servidor aplica o limite, incluindo a entrevista. CRUD não usa IA.
- Sem anexos, integrações com tribunais, emissão de notas, conciliação bancária ou cobrança real.
- Sem promessa de conformidade jurídica/LGPD completa: dados reais exigem avaliação de privacidade, retenção, backups e controles adicionais.
- A configuração usa JSON validado para campos variáveis; vínculos e valores financeiros têm colunas e restrições relacionais.
- O saldo financeiro é a diferença entre recebimentos e pagamentos registrados, não saldo bancário conciliado nem lucro contábil.

## Demonstração e evidências

- [Roteiro, custos e defesa técnica](docs/demo-day.md)
- [Modelo de dados](docs/modelo-de-dados.md)
- [Estado desta entrega](docs/entrega-mvp-advocacia.md)

Participantes: Lara Werner, Clara Queiroz, Arthur Carvalho e Henrique Maffia.
