# Arquitetura — Circuit Mapper

Documento de decisões técnicas. Complementa o `README.md`.

---

## 1. Navegação: como alternar Modo Construção e Modo Relatório

Quatro abas inferiores, cada uma com um propósito único e alvos de 60 dp:

```
┌──────────┬──────────────┬───────────────┬─────────┐
│ PROJETO  │ CONSTRUÇÃO   │ CONFORMIDADE  │ LAUDO   │
│ (PRJ)    │ (ARV)        │ (NBR)         │ (DOC)   │
└──────────┴──────────────┴───────────────┴─────────┘
```

- **PROJETO** — painel de KPIs, parecer, inventário por categoria, importar/limpar.
- **CONSTRUÇÃO** — a árvore. Cadastro, edição e exclusão. É onde o técnico passa 90% do tempo.
- **CONFORMIDADE** — dossiê de apontamentos filtrável, navegável por caminho hierárquico.
- **LAUDO** — stack de duas telas: `Cabeçalho` → `Gerar`.

Por que abas e não drawer: em campo, com uma mão no capacete e luva na outra, a barra inferior
é alcançável com o polegar e não exige gesto de arrastar da borda, que falha com luva.

A tela de Construção **não navega para uma tela de detalhe**. A edição acontece em
`BlurModal` (bottom sheet com `expo-blur`), mantendo a árvore visível atrás do modal.
Esse foi um requisito explícito: o técnico precisa ver onde está na hierarquia enquanto
digita seção e disjuntor.

---

## 2. Recursividade: como o usuário "mergulha" nas camadas

Não há navegação por camadas (push/pop de telas). A escolha foi **árvore achatada + virtualização**:

```js
flatten(tree, { expanded })  →  [{ node, level, isExpanded, hasChildren, childCount, pathLabel }]
```

- `flatten` percorre a árvore respeitando o mapa `expanded` e devolve uma lista linear.
- A lista alimenta uma `FlatList` com `initialNumToRender: 20` e `removeClippedSubviews`.
- Cada linha recebe `level`, que gera o recuo e as guias verticais.

Consequências práticas:

| Ganho | Motivo |
|---|---|
| Performance estável | só as ~20 linhas visíveis são montadas, independente de a árvore ter 40 ou 4.000 nós |
| Sem limite de profundidade | `level` é apenas um número; nenhuma tela é empilhada |
| Contexto preservado | o técnico vê pai, irmãos e filhos na mesma viewport |
| Estado de expansão persistido | `expanded` vai para o AsyncStorage junto com a árvore |

O "mergulho" é feito por expandir/recolher (alvo de 46 dp separado do alvo de edição, para
evitar toque errado com luva) e o `Breadcrumb` dentro do modal permite pular para qualquer
ancestral com um toque.

### Mutação imutável

Toda escrita usa `mapNode`, que reconstrói apenas o caminho do nó alterado:

```js
mapNode(nodes, id, fn)  // devolve nova árvore; ramos não afetados mantêm a mesma referência
```

Isso dá três coisas de graça: `React.memo` funcional em `TreeRow`, `undo/redo` por pilha
de snapshots, e ausência de bugs de aliasing quando um nó é movido ou duplicado.

Proteções estruturais:

- `isDescendant` bloqueia mover um nó para dentro de si mesmo (ciclo).
- `canNest` valida o aninhamento contra `allowedChildren` do schema.
- `auditTree` detecta IDs duplicados, itens sem descrição e aninhamentos fora do padrão.

---

## 3. Engine de exportação: escolha das bibliotecas

| Formato | Biblioteca escolhida | Alternativas descartadas e por quê |
|---|---|---|
| **PDF** | `expo-print` | `jspdf` — construir 14 páginas A4 com tabelas de 20 colunas via API imperativa é frágil e não reflui. `react-native-pdf-lib` — API de baixo nível, sem layout de texto. `expo-print` usa o motor de impressão nativo (WebKit no iOS, PrintManager no Android), então o CSS de impressão real (`@page`, `page-break`, folha paisagem) é honrado. |
| **DOC** | HTML + cabeçalhos MSO | `html-to-docx` e `docx` funcionam, mas pesam no bundle e exigem polyfills de stream. O `.doc` HTML abre e **edita** em Word, Google Docs e LibreOffice preservando tabelas, cores e quebras de página — suficiente para o caso de uso (cliente quer editar o texto do parecer). |
| **XLSX** | `xlsxWriter.js` (OOXML próprio) | `xlsx` (SheetJS) na versão community tem escrita de estilos limitada — não daria o cabeçalho grafite/amarelo nem realce condicional das linhas. O escritor próprio faz estilo, mesclagem, congelamento de painel e autofiltro, sem `Buffer` nem polyfills (roda idêntico no RN e no bundle web). |
| **PNG/JPG** | `react-native-view-shot` | Captura a **View nativa** já renderizada (`SummaryCard`), então a imagem sai idêntica ao que o técnico vê, sem segundo motor de layout. |
| **JSON** | nativo | — |

### Fonte única de verdade por saída

```
                    ┌── expo-print ──────→ PDF (14 páginas A4)
laudoHtml.js ───────┼── + MSO headers ───→ DOC (editável)
                    └── WebView/print ───→ fallback de imagem

SummaryCard.js ─────── view-shot ────────→ PNG / JPG

workbookSpec.js ────┬── xlsxWriter.js (app+web) ──→ XLSX
                    └── openpyxl (teste) ───────→ XLSX de verificação
```

Um bug de formatação no `laudoHtml.js` é corrigido uma vez e vale para PDF, DOC e imagem.
O `workbookSpec` ser um objeto puro permitiu escrever um segundo realizador em Python
(`tests/buildXlsx.py`) que valida o spec de forma independente da biblioteca do app.

### Paginação do quadro de cargas

O quadro tem 20 colunas técnicas (N., descrição, fase, V, P, S, FP, FCA, Ib, seção, PE,
disjuntor, curva, polos, DR, L, Iz, ΔV, eletroduto, status). Não cabe em A4 retrato.

```css
@page       { size: A4 portrait; }
@page land  { size: A4 landscape; margin: 11mm 9mm 12mm 9mm; }
.page.land  { page: land; }
```

Além da folha paisagem, `table-layout: fixed` + `<colgroup>` com larguras percentuais
derivadas de `COLUMNS[].width` garante que a soma seja exatamente 100% da largura útil —
nenhuma coluna é cortada. `tr { page-break-inside: avoid }` impede linha partida entre
páginas e `thead { display: table-header-group }` repete o cabeçalho.

---

## 4. Estado e persistência

```
projectReducer.js (puro, CJS)
        ↑ dispatch
ProjectContext.js (React) ──→ useMemo(validateTree) ──→ statusById, findings, summary
        ↓ debounce 600ms
persistence.js ──→ AsyncStorage (@vcm/tree, @vcm/header, @vcm/expanded)
```

- O reducer foi **extraído do contexto** justamente para ser testável sem React.
  `tests/flow.test.js` dispara ações reais do app contra o reducer real.
- Autosave com debounce de 600 ms: em campo não existe botão "salvar", e a rede pode não existir.
  Tudo é offline-first; a sincronização é manual via export/import JSON.
- `validateTree` roda em `useMemo` sobre a árvore inteira. Para 41 nós é instantâneo;
  se o levantamento crescer para milhares de circuitos, o caminho é migrar para validação
  incremental por subárvore (o motor já é puro e aceita `validateCircuit` isolado).

---

## 5. Ergonomia industrial (decisões de UI)

| Decisão | Motivo |
|---|---|
| Alvo mínimo de 56 dp (68 dp em botões grandes) | luva de raspa tem imprecisão de toque de ~8 mm |
| Chips horizontais em vez de dropdown nativo | picker nativo abre lista pequena e exige precisão; chip de 48 dp não |
| Rótulo permanente acima do campo (nunca placeholder-only) | sob sol direto o placeholder cinza desaparece |
| Fonte mínima de 13 pt na UI, corpo em 16 pt | leitura a 40–50 cm com capacete e óculos de proteção |
| Barra lateral colorida de 4 dp em cada linha | status de conformidade legível na periferia da visão |
| Chip de fase com cor do padrão industrial BR | reconhecimento imediato sem ler o texto |
| Expandir e editar em alvos separados | evita abrir o modal errado ao tentar expandir |
| `Alert` de confirmação em exclusão, com contagem de dependentes | exclusão em cascata é irreversível sem undo explícito |
| Undo sempre visível na barra de ações | erro de digitação é o incidente mais comum em campo |

---

## 6. Critérios normativos implementados

### Corrente de projeto

```
1F/2F:  Ib = P / (V · cosφ)
3F:     Ib = P / (√3 · V · cosφ)
```

### Capacidade de condução

```
Iz = Iz_tabelado(seção, isolação, método, nº condutores carregados) · FCA · FCT
```

Tabelas 36 e 37 da NBR 5410 reproduzidas para cobre, PVC e EPR/XLPE, métodos A1, B1, B2, C e E,
com 2 e 3 condutores carregados.

### Coordenação de proteção

```
Ib ≤ In ≤ Iz          (NBR 5410, 5.3.4)
```

Violação de `In > Iz` é classificada como **erro** (condutor desprotegido, risco de incêndio);
`In < Ib` também é erro (atuação indevida / restrição operacional).

### Queda de tensão

```
ΔV% = (k · ρ · L · Ib · cosφ) / (S · V) · 100      k = 2 (1F) ou √3 (3F)
ρ_Cu = 1/56 Ω·mm²/m
```

Limite de 4% em circuito terminal (6.2.7). Acima de 7% escala de ressalva para não conformidade.

### Condutor de proteção (Tabela 58)

```
S ≤ 16          → S_PE = S
16 < S ≤ 35     → S_PE = 16
S > 35          → S_PE = S/2
```

### Dimensionamento automático (`autoSize`)

Percorre a série comercial de seções e devolve a **menor** que satisfaça simultaneamente:
seção mínima da finalidade (Tabela 47), `In ≤ Iz` com FCA/FCT aplicados, e `ΔV ≤ 4%`.
O disjuntor é o primeiro da série comercial `≥ Ib`.

O resultado é **sugestão de projeto**, apresentada ao engenheiro em um `Alert` com todos os
valores calculados — nunca aplicada silenciosamente.

---

## 7. Limites conhecidos e evolução

| Limite atual | Caminho de evolução |
|---|---|
| Sem cálculo de curto-circuito (Icc) e seletividade | adicionar impedância acumulada por trecho e curvas tempo × corrente |
| Sem anexo fotográfico no PDF | `meta.photos[]` já existe no schema; falta o picker e a página de anexo |
| `.doc` em vez de `.docx` OOXML | embarcar `html-to-docx` ou gerar no servidor, se o cliente exigir |
| Validação recalcula a árvore inteira | validação incremental por subárvore quando passar de ~2.000 circuitos |
| Sem multiusuário / sincronização | o backup JSON já é o formato de troca; um backend REST fecharia o ciclo |
| Sem leitura de QR/código de barras de TAG | `expo-barcode-scanner` preencheria o campo `tag` sem digitação |
| Termografia e medições registradas como atributo livre | campos tipados dedicados quando o processo estabilizar |
