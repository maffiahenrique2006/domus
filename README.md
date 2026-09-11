# Domus System

> Plataforma de gestão operacional para escritórios de arquitetura: acompanhe demandas, projetos, financeiro e IA em um único lugar.

---

## O que é

Domus é um sistema interno para escritórios de arquitetura gerenciarem o ciclo completo de um projeto — desde a captação de demandas até o fechamento financeiro — com um assistente de IA integrado para alertas e resumos automáticos.

Este repositório contém o **MVP acadêmico** configurado para a *Vértice Espaços* (escritório fictício). É um trabalho de faculdade inspirado na Domus — **não é a Domus oficial**, que está pausada e não é acessada, alterada ou reutilizada por este projeto.

Os módulos de Visão Geral, Demandas, Projetos e Financeiro usam dados locais/mockados no frontend (não dependem do banco para a demonstração visual). A **Domus AI é a exceção**: ela chama de verdade a API da OpenAI através do servidor — não é mais uma simulação.

---

## Para quem

Escritórios de arquitetura e design de interiores de pequeno e médio porte que hoje gerenciam projetos em planilhas ou ferramentas genéricas (Notion, Trello) e precisam de uma visão integrada de demandas, cronograma e fluxo de caixa.

**Módulos disponíveis:**

| Módulo | O que faz |
|---|---|
| Visão Geral | Dashboard com KPIs, alertas e próximos marcos |
| Demandas | Gestão de leads e solicitações (lista ou kanban) |
| Projetos | Fases, tarefas, orçamento e histórico de cada projeto |
| Financeiro | Contas a receber/pagar e análise de margem por projeto |
| Domus AI | Assistente inteligente conectado de verdade à OpenAI (único módulo não demonstrativo) |

**O que é real e o que é demonstrativo:**

- **Domus AI é real**: cada mensagem enviada gera uma chamada de verdade à API da OpenAI, com a resposta e a contagem de tokens vindas diretamente da OpenAI (nada é estimado).
- **Visão Geral, Demandas, Projetos e Financeiro são demonstrativos**: navegar por esses módulos não faz nenhuma chamada à OpenAI e não consome tokens — é só para dar contexto de produto ao trabalho acadêmico.

---

## Como rodar

**Pré-requisitos:** Node.js ≥ 20, pnpm ≥ 9.

```bash
# 1. Clone o repositório
git clone https://github.com/maffiahenrique2006/domus.git
cd domus

# 2. Instale as dependências (monorepo pnpm)
pnpm install

# 3. Copie e preencha as variáveis de ambiente
cp .env.example .env
# edite .env com seus valores (veja "O que precisa" abaixo)

# 4. Inicie os serviços em terminais separados
pnpm --filter @workspace/domus-ds run dev   # Design system  → :PORT/domus-ds
pnpm --filter @workspace/domus run dev      # App principal  → :PORT
pnpm --filter @workspace/api-server run dev # API            → :PORT/api
```

> No Replit, os workflows já estão configurados — basta clicar em **Run**.

**Estrutura do monorepo:**

```
artifacts/
  domus/        → app React principal (Vite + Tailwind + Wouter)
  domus-ds/     → design system compartilhado (tokens, componentes)
  api-server/   → servidor Express (TypeScript)
lib/            → bibliotecas internas compartilhadas
scripts/        → utilitários de build e pós-merge
```

---

## O que precisa

Todas as variáveis ficam em `.env` na raiz (copie de `.env.example`). **Nunca commite valores reais** — nem em `.env`, nem em código, nem em prints/logs.

| Variável | Obrigatória | Para quê |
|---|---|---|
| `OPENAI_API_KEY` | Sim, para a Domus AI responder | Autentica as chamadas à OpenAI. Usada **somente no servidor** — nunca chega ao navegador. Sem ela, a Domus AI responde com um erro claro em vez de simular uma resposta. |
| `OPENAI_MODEL` | Sim, para a Domus AI responder | Nome do modelo da OpenAI usado pela Domus AI (ex.: `gpt-4.1-mini`). O servidor nunca troca esse valor por outro modelo silenciosamente. |
| `DATABASE_URL` | Sim | String de conexão PostgreSQL (Neon, Replit DB ou instância local) |
| `SESSION_SECRET` | Se a sessão estiver habilitada | Assina e valida sessões do servidor |
| `PORT` | Não no Replit (injetada automaticamente) | Porta de cada serviço |
| `BASE_PATH` | Sim para o build do frontend | Caminho base do Vite (use `/`) |
| `NODE_ENV` | Sim em produção | `development` ou `production` |

**Contas / serviços externos:**

- **OpenAI** — a Domus AI usa a API oficial da OpenAI (Responses API) por trás do servidor. É o único serviço externo deste MVP.
- PostgreSQL (Neon ou Replit DB) para persistir demandas, transações e o histórico de chat.

### Configurar os Secrets no Replit

1. No workspace do Replit, abra a aba **Secrets** (ícone de cadeado).
2. Adicione `OPENAI_API_KEY` com sua chave da OpenAI.
3. Adicione `OPENAI_MODEL` com o modelo desejado (ex.: `gpt-4.1-mini`).
4. Confirme que `DATABASE_URL` já está presente (Replit provisiona automaticamente ao usar o módulo `postgresql-16`).
5. **Nunca** cole a chave em código, no README, em issues ou em qualquer lugar versionado — Secrets do Replit não vão para o Git.

### Publicar no Replit

O `.replit` já define `build` (instala dependências e roda `pnpm run build`) e `run` (inicia o servidor de produção, que serve o frontend e a API `/api` na mesma porta). Para publicar:

1. Confirme que os Secrets acima estão configurados.
2. Clique em **Deploy** / **Publish** no Replit, com o `deploymentTarget = "autoscale"`.
3. Depois de publicado, abra a URL pública e teste a Domus AI com uma pergunta real.

---

## Medindo os tokens de uma demonstração

Cada resposta da Domus AI usa a Responses API da OpenAI, que devolve o uso real de tokens (`input_tokens`, `output_tokens`, `total_tokens`) — nada aqui é estimado. Esses números aparecem:

- **No frontend**, na área discreta **"Uso desta sessão"** dentro da página Domus AI (chamadas, tokens de entrada, de saída e total).
- **No servidor**, como um log estruturado por chamada (`event: "domus_ai_usage"`) com modelo, tokens e um identificador de sessão — **sem o conteúdo das mensagens**.

Para gravar uma demonstração:

1. Abra a Domus AI e clique em **"Zerar medição da sessão"** (zera só o contador do navegador — não apaga mensagens nem dados do banco).
2. Comece a gravação e use o sistema normalmente, fazendo as perguntas planejadas para a Domus AI.
3. Ao encerrar, copie os totais mostrados em "Uso desta sessão".

Importante: **navegar pelas outras páginas e módulos (Visão Geral, Demandas, Projetos, Financeiro) não consome tokens da OpenAI** — só chamadas reais à Domus AI entram nesse contador. Tokens usados pelo Claude ou pelo Replit Agent durante o desenvolvimento deste software são completamente separados e não aparecem aqui.

---

## Quem mantém

| Papel | Nome | Contato |
|---|---|---|
| Criador / mantenedor principal | Henrique Wrobel | [@maffiahenrique2006](https://github.com/maffiahenrique2006) |
| Colaborador | *(adicione seu nome aqui)* | *(GitHub ou e-mail)* |

Abra uma **Issue** no GitHub para bugs ou sugestões. PRs são bem-vindos — descreva o problema que resolve antes de implementar.

---

*Domus System · MVP acadêmico · Vértice Espaços · MIT License*
