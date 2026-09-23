# Circuit Mapper

**Mapeamento e Cadastro de Circuitos Elétricos — laudo técnico NBR 5410**

Aplicativo móvel nativo (Android APK / iOS via Expo) para levantamento hierárquico de ativos
elétricos em campo, com verificação automática de conformidade ABNT NBR 5410 e geração de
laudo técnico em 4 formatos.

Autor: **Robson do Carmo — Engenharia Elétrica**

> **Para testar agora no celular:** abra `dist/CIRCUIT-MAPPER.html` — é o app inteiro em
> um arquivo único, offline, rodando o mesmo motor de `src/core/`. Instruções e roteiro de
> teste em **[COMO-TESTAR.md](COMO-TESTAR.md)**, que também traz os comandos do APK.

---

## 1. O que o app faz

| Capacidade | Implementação |
|---|---|
| Hierarquia recursiva **sem limite de níveis** | `src/core/treeEngine.js` — funções puras e imutáveis |
| Interface **Explorer / Tree View** | `src/components/TreeExplorer.js` (FlatList virtualizada) |
| **Atributos diversos** (metadados livres) por item | `AttributeEditor.js` + `setAttribute/renameAttribute` |
| Cálculo elétrico ao vivo (Ib, Iz, ΔV, PE) | `src/core/engineering.js` — tabelas NBR 5410 |
| Checklist automático de conformidade (10 códigos NC) | `src/core/validation.js` |
| **Quadro de cargas** padrão de unifilar industrial | `src/core/loadTable.js` (20 colunas técnicas) |
| Cabeçalho de laudo + **upload de 2 logos** | `ReportSetupScreen.js` + `LogoPicker.js` |
| **Gerar Laudo** → PDF, DOC, XLSX, PNG/JPG, JSON | `src/export/` |
| Persistência offline + undo/redo | `src/store/` (AsyncStorage, 40 snapshots) |
| **Build web de arquivo único** para teste em campo | `tools/bundleWeb.js` + `web/` → `dist/` |

---

## 2. Modelo de dados (schema recursivo)

Um único tipo de nó descreve todos os níveis. Qualquer nó pode ter `children`.

```json
{
  "id": "qgbt_01",
  "label": "Quadro Geral Térreo",
  "type": "panel",
  "attributes": { "tension": "380/220V", "location": "Área Sul" },
  "meta": { "createdAt": "...", "updatedAt": "...", "notes": "", "photos": [] },
  "children": [
    {
      "id": "circ_01",
      "label": "Iluminação Hall",
      "type": "circuit",
      "attributes": { "breaker": "16", "section": "2.5", "phase": "R" },
      "children": []
    }
  ]
}
```

Tipos e regras de aninhamento (`src/core/schema.js`):

```
site → substation → transformer → panel → panel/group → circuit → load
                 ↘ area ↗
```

Nenhuma função assume profundidade máxima — o cenário de teste chega a **9 níveis**
e a suite valida **13 níveis** encadeados.

---

## 3. Estrutura do projeto

```
circuit-mapper/
├── App.js                          entrada + splash + providers
├── app.json / eas.json             configuração Expo e perfis de build (APK/IPA)
├── src/
│   ├── theme/                      paleta Sala de Controle #0E1A2B + Ciano #22D3EE
│   │   ├── colors.js               cores + cores de fase (R/S/T/N/PE) e de status
│   │   ├── typography.js           Roboto / Aptos Narrow, mínimo 13pt
│   │   └── metrics.js              alvos de toque ≥56dp (operação com luva)
│   ├── core/                       ← LÓGICA PURA (CommonJS, testável em Node)
│   │   ├── schema.js               tipos de nó + definição de campos por tipo
│   │   ├── treeEngine.js           CRUD recursivo imutável, move, duplicate, audit
│   │   ├── engineering.js          NBR 5410: ampacidade, Ib, ΔV, PE, autoSize
│   │   ├── validation.js           10 códigos de não conformidade + parecer
│   │   ├── loadTable.js            agregação do quadro de cargas e inventário
│   │   └── seed.js                 cenário fictício Vale (41 itens, 9 níveis)
│   ├── store/
│   │   ├── projectReducer.js       reducer puro (fonte única de verdade)
│   │   ├── ProjectContext.js       provider React + undo/redo + autosave
│   │   └── persistence.js          AsyncStorage com debounce de 600ms
│   ├── components/                 VButton, VField, VSelect, BlurModal, TreeRow,
│   │                               TreeExplorer, AttributeEditor, LogoPicker, ...
│   ├── screens/                    Home, Explorer, Audit, ReportSetup, Export
│   ├── navigation/                 tabs: Projeto | Construção | Conformidade | Laudo
│   ├── export/
│   │   ├── templates/laudoHtml.js  template A4 do laudo (base de PDF/DOC/IMG)
│   │   ├── workbookSpec.js         spec das 9 abas do Excel (puro)
│   │   ├── pdfExport.js            expo-print
│   │   ├── docExport.js            HTML+MSO → .doc editável
│   │   ├── xlsxWriter.js           escritor OOXML próprio, zero dependências
│   │   ├── xlsxExport.js           grava o .xlsx via expo-file-system
│   │   ├── imageExport.js          react-native-view-shot → .png/.jpg
│   │   ├── jsonExport.js           backup/restore do projeto
│   │   └── index.js                orquestrador "Gerar Laudo"
│   └── utils/polyfills.js          (removido — xlsxWriter sem dependencias)
├── web/                            build de campo (mesmo motor, shell web)
│   ├── index.html                  shell + splash + tabbar + bottom sheet
│   ├── style.css                   tema Sala de Controle em CSS (espelha src/theme/)
│   └── app.js                      UI em JS puro consumindo src/core e src/export
├── tools/bundleWeb.js              empacota tudo em dist/CIRCUIT-MAPPER.html
├── dist/CIRCUIT-MAPPER.html   ← app de arquivo único para testar no celular
├── tests/                          suite sem dependências externas
│   ├── engine.test.js              65 asserções — núcleo
│   ├── flow.test.js                44 asserções — jornada de campo no reducer real
│   ├── exports.test.js             55 asserções — templates e specs
│   ├── web.test.js                 92 asserções — app web em DOM real (jsdom)
│   ├── generateSamples.js          gera artefatos reais em tests/output/
│   ├── buildXlsx.py                verificação independente do .xlsx (openpyxl)
│   └── run-all.js                  orquestra as suites
├── scripts/                        build do APK (nuvem e local) com checagem
│   ├── BUILD-APK.bat               atalho de duplo clique no Windows
│   ├── build-apk-nuvem.ps1         EAS build — sem instalar toolchain
│   ├── build-apk-local.ps1         Gradle local (JDK 17 + Android SDK)
│   └── build-apk-local.sh          equivalente Linux/macOS
├── COMO-TESTAR.md                  web, Expo Go e APK — passo a passo
└── docs/ARCHITECTURE.md            decisões de projeto e critérios normativos
```

---

## 4. Identidade visual

| Elemento | Valor |
|---|---|
| Fundo principal | `#0E1A2B` Navy profundo (sala de controle) |
| Barras / cabeçalhos | `#0A1422` |
| Cards / linhas da árvore | `#16263D` |
| Destaque e ação | `#22D3EE` Ciano elétrico |
| Texto sobre ciano | `#06141F` |
| Conforme / Ressalva / Não conforme | `#34D399` / `#FBBF24` / `#F87171` |
| Fases R / S / T / N / PE | vermelho / branco / azul / azul claro / verde |
| Tipografia | Roboto (Android nativo) · Aptos Narrow nos documentos |
| Alvo de toque mínimo | 56 dp (acima dos 48 dp do Material) — operação com luva de raspa |
| Modais | `expo-blur` com backdrop blur — a árvore permanece visível ao editar |

---

## 5. Verificação NBR 5410 automática

| Código | Verificação | Referência |
|---|---|---|
| NC-01 | Coordenação Ib ≤ In ≤ Iz | 5.3.4 / 6.3.4.2 |
| NC-02 | Seção mínima por finalidade | Tabela 47 |
| NC-03 | Queda de tensão ≤ 4% (terminal) | 6.2.7 |
| NC-04 | DR 30 mA em TUG / área molhada | 5.1.3.2.2 |
| NC-05 | Seção do condutor de proteção (PE) | Tabela 58 |
| NC-06 | Cadastro incompleto (ressalva) | — |
| NC-07 | Desequilíbrio entre fases | 4.2.5.4 / boas práticas |
| NC-08 | Sobrecarga de barramento / proteção geral | 6.5.4 |
| NC-09 | Identificação permanente de circuito | 6.1.6 |
| NC-10 | Grau de proteção (IP) inadequado à área | 6.5.3 |

Ampacidade tabelada para cobre, isolação PVC/EPR/XLPE, métodos A1, B1, B2, C e E,
com 2 ou 3 condutores carregados (Tabelas 36 e 37), corrigida por FCA e FCT.

> O laudo gerado é um documento técnico de engenharia e **somente tem validade
> acompanhado da respectiva ART registrada no CREA**, assinada por profissional habilitado.
> O app apura e organiza; a responsabilidade técnica é do engenheiro.

---

## 6. Saídas do botão "Gerar Laudo"

| Formato | Biblioteca | Conteúdo |
|---|---|---|
| **PDF** | `expo-print` | 14 páginas A4: capa, metodologia, árvore, quadros de cargas (paisagem), inventário, apontamentos, parecer |
| **DOC** | HTML + cabeçalhos MSO | mesmo conteúdo, editável no Word / Google Docs / LibreOffice |
| **XLSX** | `xlsxWriter.js` (escritor OOXML proprio, zero dependencias) | 9 abas: CAPA, RESUMO, um quadro de cargas por painel, ATIVOS, APONTAMENTOS, HIERARQUIA |
| **PNG / JPG** | `react-native-view-shot` | resumo executivo para grupos de operação |
| **JSON** | nativo | backup completo do projeto (schema v1) para transferir entre dispositivos |

As seções do documento são selecionáveis na tela de geração.
Há também "Gerar pacote completo" (lote) e impressão via diálogo do sistema.

---

## 7. Como rodar

```bash
npm install
npx expo start            # QR code para Expo Go (iOS e Android)
```

### APK Android

Scripts prontos com verificação de pré-requisitos:

```
scripts\BUILD-APK.bat            duplo clique -> escolhe nuvem ou local
scripts\build-apk-nuvem.ps1      build na Expo (não instala nada aqui)
scripts\build-apk-local.ps1      build local (JDK 17 + Android SDK)
scripts/build-apk-local.sh       equivalente para Linux/macOS
```

Manualmente, via nuvem:

```bash
npm i -g eas-cli
eas login
eas init                                  # vincula o projeto e gera o projectId
eas build -p android --profile preview    # gera .apk instalável
```

Detalhes, pré-requisitos e por que o Firebase **não** é necessário: **[COMO-TESTAR.md](COMO-TESTAR.md)**.

### iOS

```bash
eas build -p ios --profile preview       # simulador
eas build -p ios --profile production    # TestFlight / App Store
```

Ajuste antes do primeiro build:

- `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png` — placeholders on-brand,
  troque pelos definitivos (fundo `#0E1A2B`)
- `app.json → ios.bundleIdentifier` / `android.package` se for publicar em loja

As 22 dependências foram conferidas contra o `bundledNativeModules.json` do `expo@51.0.28`
(mapa autoritativo do SDK) — todas casam, então o build não falha por versão divergente.

### Build web (para testar no celular sem compilar)

```bash
npm run build:web     # gera dist/CIRCUIT-MAPPER.html
```

Veja **[COMO-TESTAR.md](COMO-TESTAR.md)** para como levar o arquivo ao telefone e o roteiro de teste.

### Testes

```bash
npm test              # 207 assercoes em 4 suites (gera o bundle web antes)
npm run samples       # gera os documentos de exemplo em tests/output/
python3 tests/buildXlsx.py   # verificação independente do .xlsx (openpyxl)
```

O `web.test.js` carrega o bundle em um DOM real (jsdom) e exercita o fluxo por eventos de
clique e digitação: cria a hierarquia, edita atributos, aciona o dimensionamento automático,
navega pelas abas e gera os cinco formatos, conferindo o MIME type e o tamanho de cada blob.
Requer `npm i jsdom` (a suite pula esse bloco se ele não estiver disponível).

---

## 8. Cenário fictício embutido

Botão **"Carregar dados de demonstração"** na tela Projeto popula:

- Complexo Minerário Itabira — Usina de Beneficiamento 3
- SE-01 (13,8 kV) → TRF-01 (500 kVA) → QGBT-01 (800 A)
- CCM-01 (britagem e bombeamento), QDL-01 (iluminação, emergência, TUG), QD-TEL-01 (telecom)
- **41 itens · 9 níveis · 18 circuitos · 4 quadros · 267,06 kVA**
- **5 não conformidades e 7 ressalvas intencionais** — índice de conformidade 59,1%

As não conformidades foram plantadas de propósito para exercitar o motor de laudo:
disjuntor de 50 A em cabo de 6 mm² (Iz = 36 A), quedas de tensão de 4,4% a 5,5%,
TUG de oficina sem DR, iluminação externa sem DR, desequilíbrio de fases de 44% e 46%,
circuito sem identificação e quadro IP31 em área externa.

---

## 9. Decisões de arquitetura relevantes

- **`core/` em CommonJS puro**: o mesmo código roda no Metro (RN) e no Node, permitindo
  testar toda a engenharia e o reducer sem emulador. Nenhum mock de React nos testes.
- **Estado imutável com snapshots**: `undo/redo` sai de graça e o React re-renderiza de forma
  previsível em árvores grandes.
- **Uma única fonte de verdade por saída**: o HTML do laudo alimenta PDF, DOC e imagem;
  o `workbookSpec` alimenta o exceljs (app) e o openpyxl (verificação). Corrigir um bug
  de formatação corrige os três formatos.
- **`.doc` em vez de `.docx`**: mantém o bundle leve e o arquivo abre e edita em Word,
  Google Docs e LibreOffice preservando tabelas e cores. Se `.docx` OOXML for obrigatório,
  o caminho é gerar no servidor ou embarcar `docx`/`html-to-docx`.
- **Quadro de cargas em folha paisagem**: 20 colunas técnicas não caberiam em A4 retrato;
  `@page land` + `<colgroup>` proporcional garantem que nada seja cortado.
- **Escritor XLSX próprio (`src/export/xlsxWriter.js`)**: gera OOXML válido com ZIP de entradas
  STORED, sem nenhuma dependência. Substituiu o `exceljs` (que exigia `Buffer`/polyfills no Hermes);
  o `workbookSpec` alimenta o `xlsxWriter` (app e web) e o `openpyxl` (verificação independente em Python).
  Se as duas implementações concordam, o spec está correto.

---

## 10. Segurança e integridade

O app manipula dados de instalações industriais (TAGs, localidades, CNPJ/CPF, CREA/ART) e
roda offline em dispositivos que podem ser compartilhados. Hardening aplicado:

| Controle | Implementação |
|---|---|
| **Sem fallback silencioso de ampacidade** | `engineering.baseAmpacity` devolve 0 para método/isolação não tabelado; `validation` emite apontamento (NC-06). O schema só oferece `A1/B1/B2/C/E`. |
| **Veredicto inconclusivo** | Árvore sem circuitos/quadros → `INSTALACAO INCONCLUSIVA` (índice 0%), nunca CONFORME. O export bloqueia laudo inconclusivo. |
| **Aninhamento válido** | `addChild`/`moveNode` aplicam `canNest`; pai inexistente é no-op (nada é perdido). |
| **Import JSON validado** | `src/core/importValidate.js` valida forma, IDs únicos, profundidade/ciclo, limite de 50k nós e roda `auditTree`. Rejeita logos remotos (`http/https`) para evitar rastreio/carga externa no laudo. |
| **Persistência honesta** | `persistence.saveAll` grava os três blocos atomicamente (`multiSet`) e propaga erros; o contexto só confirma SAVED em sucesso e expõe `saveError`/`hydrateError` em banners. Guarda contra saves antigos sobrescrevendo estado novo. |
| **Escapação no laudo** | `laudoHtml.esc` escapa labels/atributos; logos aceitos apenas como `data:` ou `file:` locais. |
| **Responsabilidade técnica** | O laudo declara o escopo das checagens automáticas (sem Icc/seletividade/Zs) e reitera que só tem validade com ART registrada no CREA. |

> **Aviso de marca:** o nome e o cenário "Vale" são fictícios, para demonstração. Antes de
> distribuir externamente, obtenha autorização ou rebranded o app.
