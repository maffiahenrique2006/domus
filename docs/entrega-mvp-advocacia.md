# Estado desta entrega — MVP de advocacia (25/09/2026)

Este documento separa **o que foi executado e provado nesta máquina** do que **ainda depende
de acesso externo**. Nada abaixo está marcado como provado sem ter sido rodado.

## Onde o trabalho está

| Item | Estado |
|---|---|
| Pasta de trabalho | `~/Desktop/domus-mvp-demo-day`, branch local `codex/demo-day-completo` |
| Commit | **Nenhum ainda.** São 46 arquivos alterados ou novos sobre a `main` (`4223c9b`) |
| Cópia de segurança | `~/Backups/domus-mvp-codex-legal-mvp-20260925-1201.tgz` e `.patch` |
| Origem | Implementado pelo Codex em pasta temporária na manhã de 25/09; trazido para o Desktop e revisado pelo Claude Code |

## O que mudou em relação à versão publicada

- **Interface** deixou de usar dados de exemplo no navegador. Quatro páginas antigas de
  arquitetura saíram; entrou `legal-workspace.tsx` (clientes, demandas, casos, tarefas,
  financeiro) e `onboarding.tsx` (entrevista e prévia da configuração).
- **Servidor** ganhou `/api/workspace` (leitura), `/api/workspace/actions` (escrita com
  controle de revisão), `/api/onboarding` (entrevista, confirmação) e `/api/usage`
  (tokens salvos por escritório). O chat passou a guardar histórico no servidor.
- **Banco** ganhou migrações versionadas (`lib/db/migrations/`, três arquivos) com as
  tabelas do escritório, chaves estrangeiras compostas por escritório e recibo de eventos
  do Stripe. O modelo está descrito em `modelo-de-dados.md`.
- **Assinatura** só ativa o plano depois do webhook assinado do Stripe; eventos repetidos,
  falsificados ou de outro produto são ignorados.
- **CI** (`.github/workflows/ci.yml`): tipos, testes de banco, testes de cobrança, build da
  interface e do pacote da API.

## Provas executadas em 25/09 (máquina da Lara)

| Prova | Comando ou gesto | Resultado |
|---|---|---|
| Tipos | `pnpm run typecheck` | passou (5 pacotes) |
| Cobrança e sessão | `node --test artifacts/api-server/tests/billing*.test.mjs` | 19 de 19 |
| Banco e regras | `node lib/db/tests/workspace.test.mjs` | passou: migrações, isolamento entre escritórios, persistência, validação de campos, chaves por escritório, revisão desatualizada, conversão atômica, tarefas, totais financeiros, renome de cliente, cotas |
| Build da interface | `pnpm --filter @workspace/domus run build` | passou |
| Build da API | `pnpm --filter @workspace/api-server run build` e `node artifacts/api-server/build-vercel.mjs` | passou; `api/index.js` regenerado com o código novo |
| Uso pela tela, servidor local de teste | `node lib/db/tests/demo-server.mjs` e navegador em `127.0.0.1:5099` | ver tabela abaixo |

### Percurso na tela, com banco embutido e sem serviços externos

| Passo | Resultado |
|---|---|
| Entrar (rota de teste) → escritório sem configuração | abre a entrevista |
| Enviar briefing sem chave da OpenAI | servidor responde 503; tela diz "IA não configurada neste ambiente"; nada é simulado |
| Aplicar escritório fictício de teste → Clientes → Novo cliente | cliente salvo e listado |
| Demandas → Nova demanda (cliente, serviço, responsável, prazo, honorários, campo "Área") | salva no servidor |
| Editar → situação "Aprovada" → "Criar caso" → confirmar | demanda vira "Convertida em caso"; um caso na etapa "Análise"; sem duplicata |
| Casos → Tarefas → nova tarefa → concluir | "1/1 tarefas concluídas" |
| Financeiro → Novo lançamento (R$ 2.000, a receber, ligado ao caso) → Receber | A receber R$ 0, Recebido R$ 2.000, Saldo R$ 2.000 |
| Recarregar a página | todos os registros e totais continuam |
| Visão Geral | Casos 1, Recebido R$ 2.000, coerente com o financeiro |
| Domus AI → pergunta sem chave | erro honesto dentro do chat; contador de tokens continua zero |
| Minha conta | plano Free, botão "Assinar Plano Pro" (Stripe de teste) |

### Defeitos encontrados nesta revisão e corrigidos

1. **Datas um dia atrás.** "2026-10-10" aparecia como 09/10/2026: a função de exibição
   convertia a data como meia-noite UTC. Corrigida em `artifacts/domus/src/lib/utils.ts`
   para tratar "AAAA-MM-DD" como data de calendário local. Conferido na tela após a
   correção.
2. **Prioridade sem rótulo.** A lista mostrava "media"; agora mostra "Média", "Baixa",
   "Alta", "Urgente" (`legal-workspace.tsx`).
3. **Texto da conversão** pedia para "preencher as informações abaixo" mesmo quando a
   configuração não tem campo de caso. O texto agora depende da configuração.

## O que NÃO foi provado (depende de acesso externo)

| Pendência | Quem destrava | O que fica bloqueado |
|---|---|---|
| Acesso ao projeto da Vercel que publica `domus-mvp.vercel.app` | Henrique (dono do projeto) convida a conta da Lara, ou opera na própria conta | variáveis de ambiente, logs, deploy, aplicar migrações no banco de produção |
| `OPENAI_API_KEY` e `OPENAI_MODEL` válidos no ambiente de produção | Henrique | entrevista real, Domus AI real, medição real de tokens |
| Credenciais do Google e do Stripe de teste no ambiente | Henrique | login novo em aba anônima, checkout até a confirmação pelo webhook |
| Migrações `lib/db/migrate.mjs` aplicadas no banco de produção **antes** do deploy da API nova | quem tiver `DATABASE_URL` | sem isso, a API nova falha ao consultar tabelas que não existem |
| Commit e pull request | Lara decide; a conta dela tem permissão de escrita no repositório | revisão do Henrique, CI no GitHub, deploy automático da Vercel |

A lista de liberação para apresentar está em `demo-day.md`. Nenhum item dela pode ser
marcado com base nesta entrega: todos exigem a URL pública.

## Ordem recomendada a partir daqui

1. Commit escopado na branch e pull request para a `main` do repositório do Henrique.
2. Henrique aplica as variáveis, roda as migrações no banco e publica.
3. Percorrer o roteiro de `demo-day.md` na URL pública, em aba anônima, marcando cada item
   só depois de executado.
4. Gravar o vídeo de reserva a partir da versão publicada. Os vídeos antigos mostram a
   versão de arquitetura e não servem como prova desta.
