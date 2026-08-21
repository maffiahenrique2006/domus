# Domus System

Plataforma de gestão operacional para escritórios de arquitetura e design de interiores.

Demo configurado para **Vértice Espaços** — escritório fictício de arquitetura comercial.

## Módulos

| Módulo | Descrição |
|--------|-----------|
| **Visão Geral** | Dashboard com KPIs, alertas de atenção, projetos ativos e próximos marcos |
| **Demandas** | Gestão de leads e solicitações em visualização lista ou kanban |
| **Projetos** | Acompanhamento de projetos com fases, tarefas, financeiro e histórico |
| **Financeiro** | Contas a receber/pagar, gráficos de custo e margem por projeto |
| **Domus AI** | Interface ilustrativa do assistente inteligente integrado ao sistema |

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS v4 + Wouter + Framer Motion + Recharts
- **Design System:** `@workspace/domus-ds` — tokens, componentes e tema compartilhado
- **API Server:** Node.js + Express (Hono) + TypeScript
- **Monorepo:** pnpm workspaces

## Estrutura

```
artifacts/
  domus/          # App web principal
  domus-ds/       # Design system (tokens + componentes)
  api-server/     # Servidor de API
lib/              # Bibliotecas compartilhadas
```

## Rodando localmente

```bash
# Instalar dependências
pnpm install

# Iniciar todos os serviços
pnpm --filter @workspace/domus run dev        # App: http://localhost:PORT
pnpm --filter @workspace/domus-ds run dev     # DS: http://localhost:PORT/domus-ds
pnpm --filter @workspace/api-server run dev   # API: http://localhost:PORT
```

> As portas são configuradas automaticamente pela variável de ambiente `PORT`.

## Dados de demonstração

Todo o conteúdo exibido é fictício e gerado localmente (sem banco de dados). Os dados ficam em `artifacts/domus/src/data/seed.ts` com datas relativas ao dia atual para manter o demo sempre atualizado.

**Clientes e projetos no demo:**
- Loja Horizonte (Horizonte) — P-238
- Café Nômade Vila Madalena (Café Nômade) — P-239
- Escritório Alba Expansão (Alba Tecnologia) — P-235
- Pop-up Marea Verão (Grupo Marea) — P-241

## Licença

MIT
