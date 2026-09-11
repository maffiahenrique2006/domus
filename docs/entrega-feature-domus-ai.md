# ENTREGA — FEATURE DE IA DA DOMUS (Vértice Espaços)

## 1. A FEATURE

**Nome:** Domus AI

**Problema:**
No dia a dia do escritório, quem gerencia demandas, projetos e financeiro raramente tem tempo de cruzar tudo manualmente — priorizar demandas, revisar cronograma, entender o que olhar antes de fechar o mês. A pessoa sabe só a intenção ("preciso organizar minhas demandas dessa semana") e precisaria montar essa análise sozinha.

**Como funciona:**
Na página **Domus AI**, o usuário escreve uma pergunta em linguagem natural (ex.: prioridades, cronograma, financeiro). O frontend envia essa mensagem para a rota `POST /api/chat/messages` do servidor. O servidor monta um prompt de sistema com o contexto da Vértice Espaços e chama a **Responses API da OpenAI** (SDK oficial, `client.responses.create`), com o modelo definido no Secret `OPENAI_MODEL`. A resposta (`response.output_text`) e o uso real de tokens (`response.usage`) voltam ao frontend, que exibe a resposta na conversa e soma os tokens no painel **"Uso desta sessão"**.

**Exemplo de entrada:**
> Como devo priorizar minhas demandas essa semana?

**Resposta real obtida no teste desta entrega (não é simulação):**
> "As três áreas que a Domus AI ajuda a organizar são: Demandas — leads e solicitações de clientes, por área, prioridade e status. Projetos — fases, tarefas, orçamento e cronograma de cada obra/projeto. Financeiro — contas a receber e a pagar, margem por projeto e fluxo de caixa."

Essa resposta veio de uma chamada real à OpenAI (modelo `gpt-5-mini-2025-08-07`), rodada localmente com uma chave de teste — **não há modo "simulação"** na Domus AI: ou a chamada funciona de verdade, ou o usuário recebe um erro claro (ex.: "A Domus AI ainda não está configurada neste ambiente", quando falta `OPENAI_API_KEY`). Detalhes completos do teste em `docs/relatorio-de-publicacao-e-tokens.md`.

**Diferença importante em relação à demo do Carona Campus:** lá a resposta na tela é fixa/simulada (por falta de créditos) e o rótulo "Simulação" avisa isso. Na Domus, se a chave da OpenAI estiver configurada, a resposta que aparece na tela **é sempre a resposta real do modelo** — não existe texto pré-escrito sendo exibido como se fosse a IA.

---

## 2. CONTA DE CUSTOS

**Modelo testado nesta entrega:** `gpt-5-mini` (escolhido consultando `/v1/models` da conta usada no teste, já que o modelo é configurável via `OPENAI_MODEL` e não veio especificado).

**Preços oficiais atuais (conferidos na tabela da OpenAI em 2026-09-11):**

| Modelo | Entrada (por 1M tokens) | Saída (por 1M tokens) |
|---|---|---|
| `gpt-5-mini` | US$ 0,25 | US$ 2,00 |
| `gpt-4.1-mini` | US$ 0,40 | US$ 1,60 |
| `gpt-4o-mini` | US$ 0,15 | US$ 0,60 |

**Fórmula:**

```
custo por chamada =
  (tokens de entrada / 1.000.000 × preço de entrada)
+ (tokens de saída   / 1.000.000 × preço de saída)
```

**Custo real medido nesta entrega (2 chamadas reais, `gpt-5-mini`):**

| Chamada | Entrada | Saída | Custo |
|---|---|---|---|
| 1 | 244 tok | 224 tok | US$ 0,000509 |
| 2 | 241 tok | 231 tok | US$ 0,000522 |
| **Total (2 chamadas)** | **485 tok** | **455 tok** | **US$ 0,00103** |

**Estimativa para 1.000 chamadas**, considerando uma mensagem "típica" da Domus AI (~250 tokens de entrada, ~230 tokens de saída — próximo da média real medida acima):

| Modelo | Custo por chamada | Custo para 1.000 chamadas |
|---|---|---|
| `gpt-5-mini` | (250/1M × 0,25) + (230/1M × 2,00) = US$ 0,0000625 + US$ 0,00046 = **US$ 0,0005225** | **US$ 0,52** |
| `gpt-4.1-mini` | (250/1M × 0,40) + (230/1M × 1,60) = US$ 0,0001 + US$ 0,000368 = **US$ 0,000468** | **US$ 0,47** |
| `gpt-4o-mini` | (250/1M × 0,15) + (230/1M × 0,60) = US$ 0,0000375 + US$ 0,000138 = **US$ 0,0001755** | **US$ 0,18** |

Os preços devem ser reconferidos na tabela atual da OpenAI (platform.openai.com/docs/pricing) antes de qualquer decisão comercial — a tabela acima é a vigente em 2026-09-11.

---

## 3. ROTEIRO DO VÍDEO

- **0–4s:** abrir a página **Domus AI** e mostrar o painel "Uso desta sessão" já zerado (clicar em "Zerar medição da sessão" antes de gravar).
- **4–10s:** digitar uma pergunta real, ex.: *"Como devo priorizar minhas demandas essa semana?"*
- **10–18s:** enviar a mensagem (Enter ou botão de enviar).
- **18–25s:** mostrar a resposta real chegando (com indicador de digitação) e o painel "Uso desta sessão" atualizando com a chamada e os tokens reais.
- **25–30s:** explicar que essa resposta veio de verdade da OpenAI (sem simulação) e que navegar pelos outros módulos (Demandas, Projetos, Financeiro) não consome tokens — só perguntas feitas na Domus AI entram nesse contador.

Pendência para a gravação final: publicar a aplicação (Replit ou outro host) com os Secrets configurados, já que este roteiro precisa de uma URL real acessível na hora de gravar — o teste que gerou a resposta e os números acima foi feito localmente, sem publicação (ver `docs/relatorio-de-publicacao-e-tokens.md`).
