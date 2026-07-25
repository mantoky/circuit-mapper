<#
  BUILD DO APK NA NUVEM DA EXPO (EAS)
  ------------------------------------------------------------------
  Caminho mais curto: nao precisa de Android Studio, SDK nem JDK na sua
  maquina. A compilacao acontece nos servidores da Expo e voce recebe um
  link para baixar o .apk direto no celular.

  Uso:  botao direito no arquivo -> "Executar com o PowerShell"
        ou, no PowerShell dentro da pasta do projeto:
            .\scripts\build-apk-nuvem.ps1

  Se o Windows bloquear a execucao de scripts, rode antes:
      Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#>

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $raiz

function Titulo($t) {
  Write-Host ""
  Write-Host ("=" * 66) -ForegroundColor DarkGray
  Write-Host "  $t" -ForegroundColor Yellow
  Write-Host ("=" * 66) -ForegroundColor DarkGray
}
function Ok($m)   { Write-Host "  [OK]    $m" -ForegroundColor Green }
function Info($m) { Write-Host "  [..]    $m" -ForegroundColor Cyan }
function Erro($m) { Write-Host "  [ERRO]  $m" -ForegroundColor Red }

Titulo "CIRCUIT MAPPER - build do APK na nuvem (EAS)"
Write-Host "  Pasta do projeto: $raiz" -ForegroundColor DarkGray

# ---------- 0. comprimento do caminho (limite MAX_PATH do Windows) ----------
Titulo "0/5  Verificando o caminho do projeto"
$len = $raiz.Length
Write-Host "  Caminho: $raiz" -ForegroundColor DarkGray
Write-Host "  Comprimento: $len caracteres" -ForegroundColor DarkGray
if ($len -gt 120) {
  Erro "Caminho muito longo ($len caracteres)."
  Write-Host ""
  Write-Host "        O Windows limita caminhos a 260 caracteres. O node_modules do" -ForegroundColor Yellow
  Write-Host "        React Native cria arquivos com mais de 120 caracteres de" -ForegroundColor Yellow
  Write-Host "        subcaminho, entao o 'npm install' vai falhar aqui." -ForegroundColor Yellow
  Write-Host ""
  Write-Host "        Copie o projeto para uma pasta curta e rode de lah:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "            Copy-Item `"$raiz`" `"C:\Projetos\circuit-mapper`" -Recurse -Force" -ForegroundColor White
  Write-Host "            cd C:\Projetos\circuit-mapper" -ForegroundColor White
  Write-Host "            .\scripts\$(Split-Path -Leaf $MyInvocation.MyCommand.Path)" -ForegroundColor White
  Write-Host ""
  $resp = Read-Host "        Quer que eu copie para C:\Projetos\circuit-mapper agora? (S/N)"
  if ($resp -eq 'S' -or $resp -eq 's') {
    $novo = "C:\Projetos\circuit-mapper"
    New-Item -ItemType Directory -Force -Path "C:\Projetos" | Out-Null
    if (Test-Path $novo) {
      Erro "A pasta $novo ja existe. Apague ou renomeie antes de continuar."
      exit 1
    }
    Info "Copiando..."
    Copy-Item $raiz $novo -Recurse -Force
    Ok "Copiado para $novo"
    Write-Host ""
    Write-Host "  Reiniciando o script na nova pasta..." -ForegroundColor Cyan
    Set-Location $novo
    & "$novo\scripts\$(Split-Path -Leaf $MyInvocation.MyCommand.Path)"
    exit $LASTEXITCODE
  } else {
    Write-Host "        Ok. Copie manualmente e rode de novo." -ForegroundColor Yellow
    exit 1
  }
}
Ok "Comprimento do caminho adequado"

# ---------- 1. Node ----------
Titulo "1/5  Verificando o Node.js"
try {
  $nodeV = (node --version).TrimStart('v')
  $maior = [int]($nodeV.Split('.')[0])
  if ($maior -lt 18) {
    Erro "Node $nodeV encontrado, mas o Expo SDK 51 exige Node 18 ou superior."
    Write-Host "        Baixe a versao LTS em https://nodejs.org" -ForegroundColor Yellow
    exit 1
  }
  Ok "Node $nodeV"
} catch {
  Erro "Node.js nao encontrado."
  Write-Host "        Instale a versao LTS em https://nodejs.org e rode este script de novo." -ForegroundColor Yellow
  exit 1
}

# ---------- 2. dependencias ----------
Titulo "2/5  Instalando as dependencias do projeto"
if (Test-Path "node_modules") {
  Ok "node_modules ja existe (pulando o npm install)"
} else {
  Info "Isso baixa cerca de 700 MB e leva alguns minutos na primeira vez..."
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Erro "npm install falhou. Verifique sua conexao."; exit 1 }
  Ok "Dependencias instaladas"
}

# ---------- 3. eas-cli ----------
Titulo "3/5  Verificando o EAS CLI"
$temEas = $false
try { eas --version | Out-Null; $temEas = $true } catch { $temEas = $false }
if ($temEas) {
  Ok "eas-cli presente ($(eas --version))"
} else {
  Info "Instalando eas-cli globalmente..."
  npm install -g eas-cli
  if ($LASTEXITCODE -ne 0) { Erro "Falha ao instalar o eas-cli."; exit 1 }
  Ok "eas-cli instalado"
}

# ---------- 4. conta Expo ----------
Titulo "4/5  Conta Expo"
$logado = $false
try {
  $quem = eas whoami 2>&1
  if ($LASTEXITCODE -eq 0) { Ok "Autenticado como: $quem"; $logado = $true }
} catch { $logado = $false }

if (-not $logado) {
  Write-Host "  Voce precisa de uma conta Expo (gratuita) para usar o build em nuvem." -ForegroundColor Yellow
  Write-Host "  Se ainda nao tem, crie em https://expo.dev/signup" -ForegroundColor Yellow
  Write-Host ""
  eas login
  if ($LASTEXITCODE -ne 0) { Erro "Login nao concluido."; exit 1 }
  Ok "Autenticado"
}

Info "Vinculando o projeto a sua conta (gera o projectId em app.json)..."
eas init --non-interactive 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Info "Rodando de forma interativa (confirme as perguntas na tela)..."
  eas init
}

# ---------- 5. build ----------
Titulo "5/5  Compilando o APK"
Write-Host "  Perfil 'preview' -> gera .apk instalavel (nao .aab de loja)." -ForegroundColor DarkGray
Write-Host "  A compilacao roda nos servidores da Expo e leva de 10 a 20 minutos." -ForegroundColor DarkGray
Write-Host ""

eas build --platform android --profile preview

if ($LASTEXITCODE -eq 0) {
  Titulo "APK GERADO"
  Write-Host "  1. O EAS mostrou um link de download acima (e enviou por e-mail)." -ForegroundColor Green
  Write-Host "  2. Abra esse link NO CELULAR e baixe o .apk." -ForegroundColor Green
  Write-Host "  3. O Android vai pedir para permitir instalar de fonte desconhecida - autorize." -ForegroundColor Green
  Write-Host ""
  Write-Host "  Historico de builds: https://expo.dev/accounts/[sua-conta]/projects/circuit-mapper/builds" -ForegroundColor DarkGray
} else {
  Titulo "A COMPILACAO FALHOU"
  Write-Host "  O log completo esta no link que o EAS imprimiu acima." -ForegroundColor Yellow
  Write-Host "  Causas mais comuns:" -ForegroundColor Yellow
  Write-Host "    - internet caiu durante o upload do projeto" -ForegroundColor DarkGray
  Write-Host "    - conta Expo sem builds gratuitos disponiveis no mes" -ForegroundColor DarkGray
  Write-Host "    - 'eas init' nao concluiu e o projectId ficou ausente em app.json" -ForegroundColor DarkGray
  exit 1
}
