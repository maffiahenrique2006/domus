# Demo Day — Domus para escritórios de advocacia

## A mensagem central

“Empresas perdem tempo tentando encaixar sua operação em sistemas genéricos. A Domus faz o caminho inverso: entrevista o gestor e configura a gestão a partir da forma como ele trabalha. Começamos por escritórios de advocacia para provar um fluxo completo antes de expandir.”

Não afirmar que o produto já atende qualquer empresa. O recorte atual permite demonstrar a visão com regras claras, menos complexidade e teste do começo ao fim.

## Conteúdo dos cinco slides — cinco minutos

1. **Dor — 50 segundos.** Um pequeno escritório recebe demandas por diferentes canais, perde a relação entre cliente, entrega, responsável e honorários e precisa adaptar tudo às ferramentas. Isso é uma hipótese de problema a validar com escritórios, não uma pesquisa já concluída.
2. **Solução — 60 segundos.** Descrição do negócio → perguntas sobre lacunas → proposta revisável → sistema configurado. A mesma operação liga cliente, demanda, caso, tarefa e financeiro. A IA ajuda a configurar e resumir; o servidor valida e salva.
3. **Modelo de negócio — 50 segundos.** Quem paga é o gestor do escritório, por assinatura. Free para experimentar e Pro com maior limite de IA. O checkout atual é de teste. Preço comercial e margem final ainda precisam de validação; não tratar um preço de teste como receita real.
4. **Tecnologia e custo — 75 segundos.** React/TypeScript na interface, Node/Express no servidor, PostgreSQL no banco, Google no login, OpenAI na IA e Stripe na assinatura. Vercel entrega a interface estática e executa a API sob demanda. Credenciais só no servidor. Explicar a estimativa abaixo e mostrar o modelo realmente exibido no painel de uso.
5. **Dados e limites — 65 segundos.** Mostrar o DER de `modelo-de-dados.md`. Um escritório possui seus registros; cada vínculo inclui o escritório. Configuração validada e versionada, conversão em transação e tokens registrados. Limites: sem tribunal, prazos processuais automáticos, cobrança real ou equipe multiusuário nesta versão.

## Roteiro de uso — até cinco minutos

Preparação: verificar URL publicada, Google, crédito OpenAI, migrações, webhook Stripe e conta de demonstração. Usar dados fictícios. Não mostrar console com segredos. Ensaiar a latência da entrevista; as durações abaixo são metas, não garantias.

| Tempo | Ação e evidência |
|---|---|
| 0:00–0:35 | Abrir URL pública em janela anônima. Entrar com Google e mostrar escritório ainda não configurado. |
| 0:35–1:30 | Digitar o briefing abaixo; responder o que faltar. Mostrar proposta real, ajustar uma etapa ou campo e confirmar. |
| 1:30–2:20 | Criar cliente fictício e demanda “Revisão de contrato comercial”. Aprovar e converter em caso. |
| 2:20–3:05 | Criar tarefa “Revisar cláusulas de entrega”, preencher responsável e data futura, concluir. Criar honorários de R$ 2.000 e marcar recebido. |
| 3:05–3:25 | Recarregar a página e mostrar os registros e totais persistidos. |
| 3:25–4:05 | Perguntar à Domus AI: “Resuma meus casos, tarefas pendentes e recebimentos com base nos dados disponíveis. O que precisa de atenção?” Mostrar resposta e tokens reais. |
| 4:05–5:00 | Abrir Minha conta, assinar Pro no Stripe TEST, retornar e aguardar “confirmada pelo servidor”. Mostrar plano e limite atualizado. |

Briefing completo para digitar na entrevista:

> Somos o Almeida Advocacia, um escritório fictício de direito empresarial. Fazemos revisão de contratos e consultoria empresarial. Recebemos pedidos por e-mail e WhatsApp, mas perdemos o controle dos responsáveis, datas combinadas e honorários. O gestor distribui os casos para os advogados. Precisamos das etapas Triagem, Análise, Elaboração, Revisão do cliente e Concluído. Queremos acompanhar entradas de honorários e pagamentos de despesas por caso. Precisamos de um campo “Tipo de contrato” com as opções Prestação de serviços e Compra e venda, opcional no caso. Não precisamos de integração com tribunais nem de cálculo automático de prazos.

Cliente: “Aurora Comércio — fictício”. Demanda: “Revisão de contrato comercial”. Honorários previstos: R$ 2.000. Responsável: “Lara — demonstração”. Use uma data futura selecionada no dia da apresentação. Não inventar número processual ou dados de uma pessoa real.

O cartão `4242 4242 4242 4242` deve ser usado **somente no checkout marcado como teste**, com data futura e CVC de teste. Nunca usar cartão real neste MVP. Referência: [Stripe — testes](https://docs.stripe.com/testing).

Se a integração externa falhar, mostrar o erro e explicar o bloqueio; nunca chamar resposta pronta de IA real. O vídeo de backup deve ser gravado após a versão publicada passar pelo roteiro, sem cortes que escondam falhas. Os vídeos antigos não comprovam a versão de advocacia.

## Tokens e custo para 1.000 usuários

Navegar, cadastrar e editar dados não usa tokens. **A entrevista de configuração e as perguntas à IA usam tokens.** Tokens do desenvolvimento por Codex/Claude são outra despesa e não entram no uso do aplicativo.

O modelo vem de `OPENAI_MODEL`, sem troca silenciosa. Para a entrevista curta com saída estruturada, `gpt-4.1-mini` é uma opção compatível a validar em testes reais; não é uma declaração do modelo configurado em produção. A versão antiga foi testada com `gpt-5-mini`, o que não comprova o modelo ou uso desta versão.

Preços Standard verificados em 25/09/2026: `gpt-4.1-mini`, US$ 0,40 por milhão de tokens de entrada e US$ 1,60 de saída; `gpt-5-mini`, US$ 0,25 de entrada e US$ 2,00 de saída. [Tabela oficial OpenAI](https://developers.openai.com/api/docs/pricing). `gpt-4.1-mini` suporta Responses e saída estruturada. [Ficha oficial do modelo](https://developers.openai.com/api/docs/models/gpt-4.1-mini).

**Cenário hipotético, não medição nem orçamento contratado:** 1.000 usuários ativos, 50 chamadas por usuário/mês, média de 2.000 tokens de entrada e 500 de saída por chamada, sem cache.

| Modelo | Por chamada | Por usuário/mês | 1.000 usuários/mês |
|---|---:|---:|---:|
| gpt-4.1-mini | US$ 0,00160 | US$ 0,08 | US$ 80 |
| gpt-5-mini | US$ 0,00150 | US$ 0,075 | US$ 75 |

Fórmula: `chamadas × ((entrada × preço de entrada + saída × preço de saída) / 1.000.000)`.

O volume deve incluir a entrevista. Ela pode usar mais tokens que o chat; substituir a média pela medição real dos dois fluxos antes da apresentação. A tabela não inclui servidor, banco, armazenamento, observabilidade, suporte, impostos, câmbio nem taxas de pagamento. Quota diária não significa consumo médio. No teto hipotético de 100 chamadas/dia por 30 dias, mantendo a mesma média, 1.000 usuários custariam US$ 4.800/mês de IA com gpt-4.1-mini.

Não prometer que servidor/banco serão gratuitos para 1.000 usuários. O custo contratado do projeto não pôde ser consultado sem acesso à Vercel. Para margem: `receita - IA - infraestrutura - taxas - impostos - suporte`; calcular em uma única moeda e declarar as premissas. Sem preço aprovado e sem custo de infraestrutura confirmado, a margem permanece **pendente**, não 100%.

## Respostas curtas para a banca

- **A IA constrói o quê?** Uma configuração validada de um sistema existente: nome, serviços, etapas e campos. Não executamos código gerado pelo modelo.
- **Por que existe servidor?** Para validar regras, proteger credenciais, consultar somente os dados autorizados e registrar operações no banco.
- **Por que PostgreSQL?** Precisamos de vínculos consistentes e transações: uma demanda não pode criar dois casos nem vincular dados de outro escritório.
- **Onde está a chave OpenAI?** Na variável de ambiente do servidor; nunca em `VITE_*`, JavaScript público ou Git.
- **Como provar IA real?** Pergunta inédita, resposta do provedor e modelo/responseId/tokens retornados pela API; erro explícito se faltar configuração.
- **Como separar escritórios?** A sessão identifica o usuário; o servidor busca sua associação. O cliente não escolhe livremente o escritório. Consultas filtram esse vínculo e chaves estrangeiras compostas impedem relações entre empresas.
- **O que escala primeiro?** Interface estática e API sob demanda. O banco continua sendo um recurso limitado: conexões, índices, paginação, concorrência e cotas precisam de teste de carga. Não houve teste de 1.000 usuários simultâneos.
- **Concorrentes?** Comparar com planilhas, ferramentas genéricas de tarefas e sistemas jurídicos especializados. Não afirmar superioridade sem pesquisa. Diferencial proposto: configuração guiada pela operação do gestor.
- **Próxima melhoria?** Testar com escritórios e medir tempo para configurar/concluir o primeiro caso. Convites de equipe são uma candidata, não uma demanda validada.
- **O que fariam diferente?** Ter colocado persistência, isolamento e critérios de aceite desde a primeira versão, antes de sofisticar as telas.

## Critério de liberação para apresentar

- [ ] Login Google novo e retorno após logout na URL pública.
- [ ] Entrevista real concluída, prévia alterada e configuração persistida.
- [ ] Cliente → demanda → caso → tarefa → recebimento; recarga preserva dados.
- [ ] Outra conta não enxerga esses registros.
- [ ] IA real usa contexto correto e registra tokens/modelo.
- [ ] Stripe TEST confirma por webhook; cancelar checkout não libera Pro.
- [ ] Cancelamento ao fim do período e reenvio de webhook não corrompem o plano.
- [ ] Relatório de teste público, slides revisados e vídeo de backup completo.

Só marcar os itens depois de executá-los. Os testes locais automatizados complementam, mas não substituem essa lista.
