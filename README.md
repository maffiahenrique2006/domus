# Domus System

> Plataforma de gestão operacional para escritórios de arquitetura: acompanhe demandas, projetos, financeiro e IA em um único lugar.

---

## O que é

Domus é um sistema interno para escritórios de arquitetura gerenciarem o ciclo completo de um projeto — desde a captação de demandas até o fechamento financeiro — com um assistente de IA integrado para alertas e resumos automáticos.

Este repositório contém o **demo V1** configurado para a *Vértice Espaços* (escritório fictício), com dados locais/mockados e sem dependência de banco de dados externo.

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
| Domus AI | Interface do assistente inteligente (demo ilustrativo) |

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
  api-server/   → servidor Express/Hono (TypeScript)
lib/            → bibliotecas internas compartilhadas
scripts/        → utilitários de build e pós-merge
```

---

## O que precisa

Todas as variáveis ficam em `.env` na raiz. **Nunca commite valores reais.**

| Variável | Obrigatória | Para quê |
|---|---|---|
| `SESSION_SECRET` | Sim | Assina e valida sessões do servidor |
| `PORT` | Não | Porta de cada serviço (padrão: atribuída automaticamente) |
| `NODE_ENV` | Não | `development` ou `production` |
| `LOG_LEVEL` | Não | Verbosidade dos logs do servidor (`info`, `debug`, `error`) |

Crie um `.env.example` com as chaves (sem valores) e commite junto ao código para que qualquer pessoa que clonar saiba o que preencher.

**Contas / serviços externos:**

- Nenhuma dependência externa no demo V1 — tudo roda localmente.
- Para produção: adicionar banco de dados (PostgreSQL via Neon ou Replit DB) e autenticação (Clerk ou Replit Auth).

---

## Quem mantém

| Papel | Nome | Contato |
|---|---|---|
| Criador / mantenedor principal | Henrique Wrobel | [@maffiahenrique2006](https://github.com/maffiahenrique2006) |
| Colaborador | *(adicione seu nome aqui)* | *(GitHub ou e-mail)* |

Abra uma **Issue** no GitHub para bugs ou sugestões. PRs são bem-vindos — descreva o problema que resolve antes de implementar.

---

*Domus System · Demo V1 · Vértice Espaços · MIT License*
