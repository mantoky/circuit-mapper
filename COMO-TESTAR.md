# Como testar no celular

Três caminhos, do mais rápido ao mais definitivo.

---

## Opção 1 — Agora, sem instalar nada (recomendado para validar o fluxo)

**Arquivo:** `dist/CIRCUIT-MAPPER.html` (174 kB, arquivo único)

É o app inteiro em um único HTML: layout, tema Sala de Controle, árvore recursiva, cálculos NBR 5410
e geração de documentos. Roda **offline** depois de aberto — não há CDN, servidor nem
dependência de rede. O motor executado é **exatamente o mesmo** de `src/core/`
e `src/export/`: os módulos foram embarcados pelo bundler, não reescritos.

### Como levar para o celular

Qualquer um destes serve:

- **WhatsApp / Telegram para você mesmo** — envie o arquivo, abra no celular, toque em "Abrir com → Chrome".
- **Google Drive / OneDrive** — suba o arquivo, abra pelo app do Drive e escolha abrir no navegador.
- **Cabo USB** — copie para a pasta `Download` do telefone, abra o app "Arquivos" e toque nele.
- **E-mail** — anexe para você mesmo e abra o anexo no celular.

### Instalar como ícone na tela inicial

Depois de abrir no navegador:

- **Android / Chrome:** menu ⋮ → *Adicionar à tela inicial*
- **iPhone / Safari:** botão Compartilhar → *Adicionar à Tela de Início*

Abre em tela cheia, sem barra de endereço, com o ícone na home — visualmente idêntico
a um app instalado.

### Roteiro de teste sugerido (5 minutos)

1. Aba **Projeto** → *Carregar dados de demonstração* (41 itens, 9 níveis).
2. Aba **Construção** → expanda a árvore, veja as barras laterais de status e os chips de fase.
3. Toque no circuito **C-03 – Correia Transportadora TC-202**. O painel "Verificação NBR 5410
   ao vivo" mostra `Ib = 32,68 A`, `In = 50 A`, `Iz = 36 A` e o apontamento **NC-01**.
4. Tente corrigir só o disjuntor para **32 A** → continua não conforme (`In < Ib`).
   Suba a seção para **10 mm²** e o disjuntor para **40 A** → aparece **NC-05**, porque o PE
   de 6 mm² ficou abaixo do mínimo. Corrija o PE para **10** → fica CONFORME.
   Esse encadeamento é o motor NBR trabalhando, não roteiro pré-gravado.
5. Toque em ↶ (desfazer) algumas vezes e veja os valores voltarem.
6. Use o **"+"** de qualquer linha para criar item filho — só aparecem os tipos permitidos pelo schema.
7. Aba **Conformidade** → filtre por não conformidades, toque em *Abrir item* em qualquer card.
8. Aba **Laudo** → suba os dois logos pela galeria do telefone, então *Ir para geração*.
9. Gere **PDF** (abre o diálogo de impressão → *Salvar como PDF*), **Excel**, **Word**, **Imagem** e **Backup**.
10. Feche o navegador e reabra: o projeto continua lá (`localStorage`).

### Limitações honestas desta versão

| Item | Comportamento no web | No app nativo |
|---|---|---|
| PDF | diálogo de impressão do sistema → *Salvar como PDF* | `expo-print` grava o arquivo direto |
| Imagem | desenhada em `<canvas>` | `react-native-view-shot` captura a View nativa |
| Blur dos modais | `backdrop-filter` (Chrome/Safari recentes) | `expo-blur` nativo |
| Armazenamento | `localStorage` (pode ser limpo ao apagar dados do navegador) | AsyncStorage do app |
| Câmera / fotos de campo | não implementado | previsto em `meta.photos[]` |

---

## Opção 2 — App nativo real via Expo Go (precisa do seu computador)

Testa o binário nativo de verdade, com `expo-print`, `expo-blur` e `view-shot` reais.

```bash
# no computador, dentro da pasta do projeto
npm install
npx expo start
```

No celular, instale **Expo Go** (Play Store / App Store), abra e escaneie o QR Code que
aparece no terminal. Celular e computador precisam estar na mesma rede Wi-Fi.

---

## Opção 3 — APK instalável

### Firebase é necessário? Não.

Pergunta direta, resposta direta: **o Firebase não tem nenhuma relação com gerar o APK**, e
este aplicativo **não usa Firebase nem Firestore**. Não há regras de segurança a escrever,
porque não há banco na nuvem.

O app é offline-first por decisão de projeto — foi feito para funcionar em subestação, casa de
telecom e galeria de correia, onde não há sinal. Todo o dado fica no dispositivo:

| O que | Onde fica | Arquivo |
|---|---|---|
| Árvore de ativos + cabeçalho do laudo | AsyncStorage (armazenamento local do app) | `src/store/persistence.js` |
| Transferência entre dispositivos | arquivo `.json` que você exporta e importa | `src/export/jsonExport.js` |
| Documentos gerados | pasta de documentos do app, compartilháveis pelo menu do sistema | `src/export/` |

O que o APK realmente exige é o **toolchain de compilação Android**: JDK 17, Android SDK e
Gradle. Nada de backend.

**Quando o Firebase passaria a fazer sentido:** se você quiser sincronização entre vários
técnicos em campo, histórico de revisões no servidor, login corporativo ou envio automático do
laudo para uma central. Aí o Firestore seria uma escolha razoável — o schema recursivo já está
pronto para isso (cada nó tem `id` estável e `meta.updatedAt`, o que facilita merge). Se quiser
seguir por esse caminho depois, me peça: eu monto o modelo de coleções, as regras de segurança
e a camada de sincronização com resolução de conflito. Mas isso é evolução de produto, não
requisito de build.

### ANTES DE TUDO: copie o projeto para uma pasta curta

O projeto foi entregue dentro da pasta de sessão do Cowork, cujo caminho tem **208 caracteres**:

```
C:\Users\robso\AppData\Roaming\Claude\local-agent-mode-sessions\...\outputs\circuit-mapper
```

O Windows corta caminhos em **260 caracteres**, e o `node_modules` do React Native cria
subcaminhos de 100 a 130 caracteres, como
`node_modules\@react-native\gradle-plugin\settings-plugin\src\main\kotlin\com\facebook\react\ReactSettingsPlugin.kt`
(114 caracteres). Somando, passa de 320 — o `npm install` falha com erro de caminho longo.

Além disso, a pasta de sessão é temporária. Copie para uma pasta curta e permanente:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

$origem  = "C:\Users\robso\AppData\Roaming\Claude\local-agent-mode-sessions\2c7e6c52-8bf0-43e1-b751-ee3f4c01f3e8\7c67d387-a4c4-4b31-85ca-17beab1623d2\local_f0d48a3c-7965-489e-b734-ca6f9510bced\outputs\circuit-mapper"
$destino = "C:\Projetos\circuit-mapper"

New-Item -ItemType Directory -Force -Path "C:\Projetos" | Out-Null
Copy-Item $origem $destino -Recurse -Force
Set-Location $destino
```

Com `C:\Projetos\circuit-mapper` (31 caracteres) sobram mais de 200 para o `node_modules`.

Os scripts detectam caminho longo automaticamente e oferecem fazer essa cópia por você.

### 3a — Script pronto: build na nuvem da Expo (recomendado)

Não instala Android SDK nem JDK na sua máquina. A compilação roda nos servidores da Expo.

**Duplo clique em `scripts\BUILD-APK.bat` e escolha a opção 1.**

Ou, no PowerShell dentro da pasta do projeto:

```powershell
.\scripts\build-apk-nuvem.ps1
```

O script faz tudo e para com mensagem clara se algo faltar:

1. confere se o Node é 18+
2. roda `npm install` se `node_modules` não existir
3. instala o `eas-cli` se não estiver presente
4. pede o login da Expo (conta gratuita — crie em https://expo.dev/signup)
5. roda `eas init` para vincular o projeto e gerar o `projectId`
6. dispara `eas build --platform android --profile preview`

Ao terminar (10 a 20 min), o EAS imprime um **link de download** e também manda por e-mail.
Abra o link **no celular**, baixe o `.apk` e autorize "instalar de fonte desconhecida".

O perfil `preview` do `eas.json` está com `buildType: "apk"` — é o que produz arquivo
instalável direto, em vez do `.aab` de loja.

> Se o Windows bloquear a execução do script, rode antes:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

### 3b — Script pronto: build na sua máquina

Sem nuvem e sem conta, mas exige o toolchain instalado:

- **JDK 17** — o SDK 51 não compila com JDK 11 nem com 21. O Android Studio já traz um em `jbr\`,
  e o script detecta isso automaticamente.
- **Android SDK** com plataforma **android-34** e **build-tools 34** (SDK Manager do Android Studio).
- **ANDROID_HOME** apontando para a pasta do SDK — o script assume `%LOCALAPPDATA%\Android\Sdk`
  se a variável não existir.

**Duplo clique em `scripts\BUILD-APK.bat`, opção 2.** Ou:

```powershell
.\scripts\build-apk-local.ps1     # Windows
```
```bash
./scripts/build-apk-local.sh       # Linux / macOS
```

O script verifica cada pré-requisito antes de começar, roda `expo prebuild`, chama
`gradlew assembleRelease` e copia o resultado para **`dist\CIRCUIT-MAPPER.apk`**.
Se faltar algo, ele diz exatamente o que instalar e sugere o caminho da nuvem.

Para instalar por cabo USB, com depuração USB ativada no telefone:

```powershell
adb install -r dist\CIRCUIT-MAPPER.apk
```

### Por que eu não gerei o APK para você

Verifiquei em vez de supor. O ambiente onde trabalho tem acesso de rede apenas ao registro npm
e ao GitHub:

```
registry.npmjs.org    200        github.com            200
dl.google.com         BLOQUEADO  maven.google.com      BLOQUEADO
services.gradle.org   BLOQUEADO  repo1.maven.org       BLOQUEADO
api.adoptium.net      BLOQUEADO  api.expo.dev          BLOQUEADO
```

O Android SDK e o Android Gradle Plugin existem **somente** em `dl.google.com` /
`maven.google.com`, sem mirror legítimo. E o `eas build` precisaria da sua credencial Expo,
que eu não tenho e não devo pedir. Não é limitação de esforço: é rede e credencial.

### O que eu validei aqui para o seu build não falhar

Como npm está acessível, baixei o pacote `expo@51.0.28` e comparei o `package.json` do projeto
contra o `bundledNativeModules.json` — o mapa **autoritativo** de versões do SDK 51:

- **22 de 22 dependências conferem exatamente.** Nenhum "expected version X, found Y".
- `app.json` e `eas.json` validados: `android.package` no formato correto, `buildType: apk`
  no perfil preview, assets presentes, e o `extra.eas.projectId` **removido** (o placeholder
  antigo causaria "project not found"; o `eas init` cria o correto).
- **Removi o `exceljs`.** Ele depende de `archiver`, `unzipper`, `readable-stream` e `tmp` —
  módulos de core do Node que não existem no Hermes. Era falha de build ou crash em produção
  esperando para acontecer. Substituí pelo escritor próprio `src/export/xlsxWriter.js`, sem
  dependência alguma, com encoder UTF-8 e base64 próprios (testados byte a byte contra a
  implementação de referência), e conferi a planilha resultante com openpyxl e LibreOffice.
- Com isso o app ficou com **zero dependências hostis ao React Native** e o polyfill de
  `Buffer` deixou de ser necessário.

## Regenerar o app web depois de mexer no código

```bash
npm run build:web     # regera dist/CIRCUIT-MAPPER.html
npm test              # 256 asserções (inclui 92 do app web via jsdom)
npm run samples       # regera os documentos de exemplo em tests/output/
```

O bundler (`tools/bundleWeb.js`) inlina os módulos de `src/core` e `src/export` com um shim
CommonJS de 30 linhas que resolve caminhos relativos. Não há etapa de transpilação: se você
alterar `src/core/validation.js`, tanto o app Expo quanto o app web passam a usar a nova regra.
