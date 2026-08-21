# design.md — Domus System

**Este arquivo decide com que cara o produto fala.** O PRD dirá o que ele faz; este diz
como a pessoa entende o que fazer na tela.

Ele existe por um motivo prático: **quem não decide recebe o padrão da IA.** Um agente sem
instrução escolhe sempre a mesma coisa — roxo metálico, sombra difusa, canto arredondado,
gradiente de herói. Nada aqui é ilustração: cada linha é uma decisão tomada para que ninguém
tenha que tomá-la de novo.

| | |
|---|---|
| **Onde vive** | `04-produto/domus-system/identidade/aprovados/2026-08-16-fundamentos-visuais/` — junto das peças que ele descreve |
| **Quem lê** | a Lara, os quatro agentes da casa, e qualquer modelo que receba o arquivo colado |
| **O que guarda** | a **intenção**: identidade, UI e UX |
| **O que não guarda** | os valores e as peças. Isso é o design system, e está listado no fim |
| **Estado** | vigente desde 16/08/2026, derivado da identidade aprovada em `DOMUS-0008` |

## 0. O que este arquivo não decide

O Domus System é construído por dois assentos ao mesmo tempo. A costura entre eles é o
princípio **P-05**: *padrão funcional antes do acabamento.*

- **O assento Codex decide o que a tela faz:** que telas existem, que dado aparece, que
  coluna some primeiro, o que é uma demanda, o que é uma rotina.
- **Este arquivo decide como isso se parece e como se comporta ao toque.**

**Onde os dois se cruzarem, a decisão funcional ganha.** Se este documento pede um painel
lateral e a função exige uma página inteira, é página inteira — e este documento se corrige.

---

## 1. Overview da marca

### A referência, em uma frase

> **A Domus se parece com o átrio de uma casa romana ao entardecer, visto de dentro, com o
> óculo aberto no teto.** A pedra é escura e tem grão. A única luz vem de cima e de dentro,
> e é ela que diz o que importa.

Isso não é enfeite — é a regra de leitura de tudo que vem abaixo. **Nesta identidade o
brilho é hierarquia.** O que está aceso é o que a pessoa deve olhar; o que está apagado
continua legível, mas espera a vez.

### O que a Domus é

- **Uma casa, não um painel.** Quem entra está em cômodos que tem nome, não numa esteira de
  cards. Área, trabalho, entrega — não «itens».
- **Densa e calma.** É um sistema de gestão: quem usa passa o dia numa tabela. Cabe muita
  informação, e ainda assim não grita.
- **Acesa por dentro.** Todo campo de cor nasce do quase-preto e sobe até a luz. Nada é
  chapado.
- **Honesta sobre o que sabe.** Ela é operada por agentes; o que é estimativa aparece como
  estimativa. Ver a seção 9.

### O que a Domus não é

- Não é um app de produtividade colorido, de cards flutuantes e ilustrações.
- Não é um dashboard corporativo de grade cinza e bordas duras.
- Não é minimalismo branco — o fundo é escuro por decisão, não por moda.
- Não é retrô. A referência é romana; a execução é de hoje.
- Não usa emoji como marcador de seção, nem ícone decorativo sem função.

### Como o design é medido

Não por estética. **Pelo percentual de acerto da intenção:** a pessoa conseguiu fazer o que
veio fazer? Duas consequências práticas:

- **A regra da porta.** Uma boa interface se auto-explica. Toda vez que algo precisar de
  tutorial, o defeito é da tela, não de quem não entendeu.
- **Simplificar é tirar, não esconder.** Enfiar tudo atrás de um menu parece minimalista e
  não é simples. O caminho comum fica visível; o avançado, um nível abaixo.

---

## 2. Cores

**O azul é a cor principal, e é a única que quer dizer «isto responde ao toque».**

A paleta veio das referências da Lara e passa por três provas automáticas (contraste WCAG,
separação perceptual entre áreas, e as duas de novo no tema claro). O script reprova com
código de saída 1 — ver a seção **Design system** no fim.

### Os quatro papéis da cor

Esta é a regra que faz o sistema aguentar dez áreas sem virar arco-íris. **Cada cor tem um
papel, e cada papel tem lugares onde pode aparecer. Fora deles, não aparece.**

| Papel | Cor | Só pode aparecer em | Quer dizer |
|---|---|---|---|
| **Interação** | azul | botão principal, link, foco, seleção, item de menu ativo | «isto responde ao toque» |
| **Estado** | verde · âmbar · vermelho · azul-info | pílula, validação, aviso, ícone de resultado | «isto aconteceu» — sempre com símbolo |
| **Pertencimento** | as dez de área | campo do cabeçalho, crachá, trilho de 3px, série de gráfico | «isto é de tal área» |
| **Estrutura** | os cinzas | fundo, superfície, texto, linha, borda | nada — é o silêncio de onde o resto aparece |

**Estado grita, área sussurra.** As duas famílias aparecem lado a lado numa mesma linha de
tabela, então nunca compartilham lugar: estado mora na pílula, área mora no crachá.

**Cor nunca é o único portador.** A pílula carrega símbolo, o crachá carrega o nome escrito.
Quem não distingue as cores continua lendo a tela.

### As famílias

| Família | Papel | Regra |
|---|---|---|
| **Azur** — `--acao`, `--acao-tinta` | a interação | é o único azul que vira texto e preenchimento |
| **Ultramarina** — `--marca-de` | campo da marca | **só fundo, em tamanho grande.** Luminância baixa demais para texto |
| **Ciano** — `--luz` | a luz | brilho, foco do óculo, ponta de gradiente. Nunca texto, nunca superfície |
| **Cinzas frios** | a estrutura | a base não é preto puro: puxa para o azul. `#000` fica só na marca |

### As dez áreas, e como uma nova ganha cor

Cada área é um **par de gradiente** (o campo) mais uma **tinta** (o crachá, o trilho, o
texto). A lista sai de `05-fundacao/registry/vocabularios.yaml` — não se inventa área aqui.

**A regra para uma área nova:**

- **por dentro** — a máquina, a regra, a estrutura;
- **para fora** — dinheiro, gente, mercado;
- **a casa** — as três áreas da Domus, que não são negócio: recebem metal, sem matiz própria;
- as quatro matizes de **estado** são **reservadas**. Nenhuma área mora nelas.

`portfolio` é o único sem cor própria, de propósito: ele atravessa todos os negócios, então
o campo dele são as outras nove, afundadas no escuro.

---

## 3. Tipografia

Duas famílias, e só. Um sistema de gestão não precisa de fonte de display — precisa de uma
que aguente tabela densa e de uma que alinhe número em coluna.

| Uso | Família |
|---|---|
| Tudo que é texto e interface | **Inter** — pesos 400, 500, 600, 700 |
| Número, identificador, data, código, caminho de arquivo | **IBM Plex Mono** — 400, 500 |

**Entrelinha e espaçamento entre letras não são um valor só para todo tamanho.** Título
grande quer letra mais junta e linha mais curta; texto pequeno quer o contrário. Um
`letter-spacing` fixo está errado em algum lugar da tela, sempre. Cada degrau da escala
carrega os três valores juntos — são dez degraus, e tamanho fora deles é chute.

O padrão do corpo é **14px**; a linha de tabela usa **13px**.

Use mono para: valor, data, ID, hash, caminho. **Não use para:** título, rótulo, texto
corrido. Em coluna de números, sempre com `font-variant-numeric: tabular-nums` — é isso que
alinha na vírgula sem truque.

---

## 4. Layout e espaçamento

**Tudo é múltiplo de 4.** Número fora da escala é chute, e chute é o que faz uma tela
parecer montada por duas pessoas diferentes.

A densidade é a decisão de fundo: a linha de tabela tem **38px**, não 52. Mas a área
clicável mínima continua **44px** — quando o alvo é menor, o espaço em volta entra na conta.

| Medida | Valor | Por quê |
|---|---|---|
| Altura de controle | 34px | Botão, campo, seletor e busca têm a **mesma** altura — senão a barra de ferramentas fica com degrau |
| Altura de linha | 38px | Tabela e lista |
| Alvo de toque | 44px | Mesmo num ícone de 16px |
| Largura do menu | 224px | Cabe o rótulo mais longo em uma linha |
| Largura do painel | 420px | Cabe um formulário sem esconder a lista |
| Largura de leitura | 68ch | Máximo para texto corrido |

**Rótulo de menu cabe em uma linha.** Quando não cabe, o errado é o rótulo — não a largura
do menu. Alargar o menu comprime a tela inteira, para sempre; renomear é mais barato.

---

## 5. Profundidade e sombras

A luz nasce do escuro, então **cada nível acima do fundo é mais claro, nunca mais escuro.**

| Superfície | Uso |
|---|---|
| `--fundo` | a aplicação |
| `--superficie` | cartão, tabela, menu |
| `--superficie-alta` | menu suspenso, campo em foco, linha sob o cursor |

**Sombra cresce com a superfície.** Um chip e um modal não usam a mesma sombra: superfície
maior lê como mais grossa — desfoque maior e sombra mais funda. São três níveis, e nada
usa sombra só para «destacar».

**Material translúcido:** barra de topo e painel **flutuam** sobre o conteúdo, com o conteúdo
passando por baixo — em vez de barras opacas que comem uma faixa fixa da tela. Uma regra não
se quebra: **nunca empilhar um material claro sobre outro**; a legibilidade desaba.

**Grão.** Campo de cor grande leva grão — é ele que impede um gradiente de virar plástico e
faz o preto parecer parede em vez de vazio. Nunca em texto, botão ou tabela.

---

## 6. Shapes e formas

O raio cresce com a superfície. Chip pequeno com raio grande vira comprimido; painel grande
com raio pequeno vira caixa.

| Raio | Onde |
|---|---|
| 4px | caixa de seleção |
| 6px | botão, campo |
| 10px | cartão, painel |
| 16px | modal, capa |
| pílula | estado, crachá |

**O símbolo é o óculo** — o furo no alto da cúpula, construído com a geometria real do
Panteão: cinco anéis de vinte e oito caixotões. Ele degrada por **simplificação**, não por
redução: 5 anéis → 3 → 1 anel e um ponto. São três arquivos diferentes, não a mesma arte
escalada.

**Ícones:** traço de 1,5, ponta redonda, grade de 16. Sem preenchimento, sem duas espessuras
na mesma tela.

**A marca tem duas aplicações, e a regra é sobre o fundo:**

- **`marca`** — na rampa azul, para fundo escuro: o sistema, um documento, o favicon;
- **`luz`** — em **branco puro**, para pousar sobre campo de cor: abertura, capa de área.
  Branca de propósito: qualquer matiz aqui competiria com a cor do campo.

**A cor está na marca ou no campo, nunca nos dois.** É isso que permite a mesma marca pousar
sobre o campo rosa de marketing e o verde de financeiro sem brigar com nenhum.

---

## 7. Componentes

As peças existem montadas em `componentes.css` e demonstradas funcionando no documento de
fundamentos. **Aqui fica só o que o CSS não guarda: quando usar cada uma.**

### Botão

Quatro variantes, e a escolha é a **ordem de importância da ação na tela**, não estética.

| Variante | Quando | Quantos por tela |
|---|---|---|
| Principal | a ação que a tela existe para fazer | **um.** Dois principais é nenhum |
| Secundário | alternativa legítima: cancelar, voltar, exportar | quantos precisar |
| Terciário | apoio que não deve competir | quantos precisar |
| Destrutivo | apaga, revoga, encerra | raro, e nunca ao lado do principal |

**O destrutivo é neutro parado** e só ganha vermelho no hover, com ícone de lixeira. Vermelho
ao lado do azul de ação vira ruído, e pesa mais quando é raro.

**Rótulo é verbo:** «Salvar», «Abrir trabalho», «Conceder acesso». Nunca «OK», «Enviar»,
«Confirmar». Nunca mais de três palavras. **Botão é sempre azul** — nunca da cor da área.

### Campo e escolha

A validação acontece **ao sair do campo**, não ao enviar. Descobrir seis erros de uma vez no
fim é o padrão que faz alguém desistir. A mensagem diz **como consertar**, não «campo
inválido».

| Controle | Quando | Efeito |
|---|---|---|
| Caixa de seleção | várias opções independentes | aplica ao salvar |
| Rádio | uma entre poucas, todas visíveis | aplica ao salvar |
| **Interruptor** | liga e desliga uma coisa só | **aplica na hora** — por isso não entra em formulário |
| Seletor | uma entre muitas | aplica ao salvar |

### Tabela

É onde quem usa passa o dia. Linha de 38px, sem linha vertical (o alinhamento já separa),
cabeçalho grudado no topo, ícone de tipo no cabeçalho, número à direita em mono.

**A tabela termina onde termina.** Não esmaecer as últimas linhas num degradê: fica bonito
num anúncio e **esconde dado** num sistema — quem olha não sabe se a lista acabou ou se o
sistema parou de mostrar.

### As três camadas por cima

A diferença entre elas é **quanto interrompem**:

| Camada | Interrompe? | Quando | Sai por |
|---|---|---|---|
| Painel lateral | não — o fundo continua vivo | detalhe ou edição sem perder a lista | onde entrou, pela direita |
| Modal | sim — escurece o fundo | decisão que não pode ser adiada, ou confirmação destrutiva | Esc, fora, ou botão |
| Aviso | não | resultado de algo que já aconteceu | sozinho, ou fechado à mão se tiver ação |

**Sai pelo mesmo caminho por onde entrou.** Entrar pela direita e sair por baixo desorienta.

### Movimento

**Resposta no aperto, não no soltar.** O botão reage no instante em que o dedo encosta;
esperar o clique terminar faz a interface parecer morta.

**Mola, não duração.** Uma curva de duração fixa não aceita ser agarrada no meio do caminho;
uma mola aceita — o alvo muda e o movimento continua contínuo. Vale para tudo que se arrasta.

**Repique só onde o gesto carregou impulso.** Um menu que apenas apareceu repicando fica
errado; um cartão que foi arremessado repicando fica certo.

Três sinais do sistema operacional são obrigatórios: `prefers-reduced-motion` (deslizamento
vira cruzamento de opacidade, o que informa continua), `prefers-reduced-transparency`
(material fica opaco) e `prefers-contrast: more` (fundo quase sólido, borda definida).

---

## 8. UX — o que a tela precisa responder

Design system não cobre isto, e é onde a maioria das telas quebra.

### Toda tela responde quatro perguntas

Onde estou · para onde posso ir · o que tem aqui · como saio. **Nunca prender ninguém.**

### Estado vazio

É a primeira tela que alguém vê, e a que mais some do projeto. Ela diz três coisas: **o que
vai aparecer aqui**, **por que ainda não apareceu**, e **o que fazer agora** — com o botão
da ação junto.

Vazio nunca pode ser confundido com falha. «Nenhum trabalho aberto» e «não consegui carregar»
são telas diferentes, com palavras diferentes.

### Carga

Mostra a **forma** do que vem — não um giro no meio do vazio. Quem lê já entende o layout
antes do dado chegar.

### Erro

Diz o que aconteceu **e o que fazer**. Sem culpa, sem desculpa, sem jargão. Erro de campo
aparece no campo; erro de sistema aparece onde a ação foi disparada.

### Confirmação

**Só para o que é destrutivo e irreversível.** Confirmar tudo treina a pessoa a clicar sem
ler, e aí a confirmação que importava não protege nada. Onde der, prefira **desfazer** a
confirmar.

### Hierarquia

Uma tela tem **um** assunto principal. O resumo vem antes do detalhe. O que precisa de
atenção lê num relance — por forma, não só por número.

---

## 9. O que a Domus não faz

Existem 18 tipos catalogados de **design enganoso** — padrões que induzem ao erro de
propósito. Os clássicos: difícil de cancelar, opção pré-marcada, cronômetro falso, assinatura
escondida. Em setembro de 2025 a Amazon fechou acordo de US$ 2,5 bilhões com a FTC por causa
disso.

**A Domus não vende nada e não tem usuário para enganar — a Lara é a dona.** Copiar essa
lista aqui seria peso morto. Mas o mecanismo tem uma versão que importa muito, e é esta:

> **Um sistema operado por agentes pode enganar o próprio dono.** Não por má-fé — pelo mesmo
> mecanismo: mostrar um estado que não é verdade.

Estas são as regras que valem no lugar daquela lista:

| Não fazer | Por quê |
|---|---|
| Mostrar «concluído» sem artefato | A casa já tem `truth_state` para isso. A tela precisa herdar a mesma disciplina |
| Barra de progresso que sugere certeza que não existe | Progresso estimado se anuncia como estimado |
| Vazio que parece «nada a fazer» quando foi falha de carga | São duas telas diferentes |
| Recomendação de agente com o mesmo peso visual de um fato | O que veio de máquina se identifica — é por isso que **agente usa o óculo como avatar e pessoa usa iniciais** |
| Número sem dizer de quando é | Dado velho parecendo fresco é o engano mais fácil de cometer |
| Ação irreversível a um clique de distância da rotina | Distância física é proteção |

### E o caso que não é má-fé

Em 2018 o Havaí disparou um alerta de míssil por engano. A apuração apontou **falha de
design, não erro humano** — a solução foi redesenhar a tela com confirmação dupla e cores
distintas, não treinar mais o operador.

**A regra que fica:** quando a Lara fizer a coisa errada no sistema, o conserto é a tela —
não uma regra pedindo mais atenção. Culpar a pessoa é o jeito mais barato de não consertar
nada. É a mesma disciplina das lições da casa: o incidente vira regra no mecanismo.

---

## 10. Do's and don'ts

**Faça**

- Um botão principal por tela, com verbo no rótulo.
- Cor de área só nos quatro lugares dela: campo do cabeçalho, crachá, trilho, série de gráfico.
- Estado sempre com símbolo; crachá sempre com o nome escrito.
- Todo controle de uma linha com a mesma altura.
- Número em mono, alinhado à direita, com `tabular-nums`.
- Gradiente nascendo do quase-preto e subindo até a luz.
- Grão em campo de cor grande.
- Texto de erro que diz como consertar.
- Vazio que diz o que vai aparecer ali e oferece a ação.

**Não faça**

- Botão colorido com a cor da área — botão é sempre azul.
- Cor de área para dizer estado: «vermelho» não é «atrasado».
- Recolorir o óculo ou a gravura para a cor de uma área.
- Gravura dentro de barra, menu ou lista — o detalhe vira ruído; ali vai o óculo.
- Escrever «Domus System» ao lado do óculo — o wordmark pertence à gravura.
- Esmaecer o fim de uma lista.
- Sombra para «destacar» sem hierarquia real.
- Gradiente em barra de gráfico: fica bonito e engana a leitura da altura.
- Confirmação em ação que não é destrutiva.
- Emoji como marcador de seção.
- Mais de seis séries num gráfico.
- Valor solto fora da escala de 4px, da escala tipográfica ou da lista de raios.

---

## 11. Quando a resposta não está aqui

**Não invente e não caia no padrão.** Nesta ordem:

1. Procure o token semântico mais próximo em `fundamentos.css` e use-o.
2. Se for uma peça nova, monte-a com as peças que já existem antes de criar uma.
3. Se ainda não resolver, **nomeie a lacuna** — em texto, na entrega — em vez de contorná-la.
4. Decisão de identidade é da Lara. Decisão de função é do assento Codex.

Se um componente escrever `var(--ink-700)` direto em vez de um token semântico, ele para de
trocar de tema — e ninguém descobre até alguém abrir o sistema de dia.

---

## O design system — onde estão as peças

Este arquivo guarda a intenção. Os valores e as peças são vizinhos dele, nesta mesma pasta:

| Arquivo | O que é |
|---|---|
| `fundamentos.css` | **os valores** — 188 tokens em três camadas (primitivo → semântico → componente), com os dois temas |
| `componentes.css` | **as peças montadas** — 37 classes: botão, campo, escolha, pílula, crachá, cartão, tabela, menu, aviso, abas, trilha, campo de área, esqueleto |
| `fundamentos-visuais.html` | o catálogo, com cada peça funcionando e a regra de uso ao lado |
| `marca/` | óculo em três variantes (SVG) e a gravura nas duas aplicações |
| `prova/paleta.py` | as três provas. Sai com código 1 se reprovar — serve em CI |
| [Figma](https://www.figma.com/design/mu5jJuFntZW8oXOR0v1NNt) | variáveis nos dois modos, 11 estilos de texto, 4 conjuntos de componentes |

Para consumir, importe nesta ordem:

```css
@import "fundamentos.css";
@import "componentes.css";
```

**Nada em `fundamentos.css` e `componentes.css` é editado à mão** — os dois são gerados por
`prova/tokens.py` e `prova/montar.py` a partir da paleta e do documento aprovado. Editar a
saída é criar a segunda cópia que envelhece.

---

## O que ainda não existe

Nomeado, não contornado:

- **conjunto de ícones final** — os 26 atuais demonstram traço e peso;
- **a gravura em vetor** — o óculo cobre todo uso pequeno, então isso não bloqueia nada;
- **cor de série de gráfico acima de seis séries** — depende do grupo 10 do catálogo do Codex;
- **comportamento em tela pequena** — é o grupo 15, e é dele;
- **área de RH** — hoje mora dentro de «operações» no `vocabularios.yaml`;
- **o nome público da Domus** — decisão da Lara, aberta desde a `DOMUS-ADR-0001`.

---

*chief da Domus · assento `claude-code` · 16/08/2026 · trabalhos `DOMUS-0008` (identidade
aprovada) e `DOMUS-0009` (este arquivo).*
