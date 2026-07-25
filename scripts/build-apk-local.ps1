<#
  BUILD DO APK NA SUA MAQUINA (sem depender da nuvem)
  ------------------------------------------------------------------
  Exige, alem do Node:
    - JDK 17          (o Expo SDK 51 nao compila com JDK 11 nem 21)
    - Android SDK     platform-tools, platform-34 e build-tools 34
    - ANDROID_HOME    apontando para a pasta do SDK

  O caminho mais simples de obter os dois: instalar o Android Studio e,
  no SDK Manager, marcar "Android 14 (API 34)" e "Android SDK Build-Tools 34".
  O Android Studio ja traz um JDK 17 embutido (jbr).

  Uso:  .\scripts\build-apk-local.ps1
#>

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $raiz

function Titulo($t) {
  Write-Host ""; Write-Host ("=" * 66) -ForegroundColor DarkGray
  Write-Host "  $t" -ForegroundColor Yellow
  Write-Host ("=" * 66) -ForegroundColor DarkGray
}
function Ok($m)   { Write-Host "  [OK]    $m" -ForegroundColor Green }
function Info($m) { Write-Host "  [..]    $m" -ForegroundColor Cyan }
function Erro($m) { Write-Host "  [ERRO]  $m" -ForegroundColor Red }

Titulo "CIRCUIT MAPPER - build local do APK"

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

# ---------- pre-requisitos ----------
Titulo "1/5  Verificando pre-requisitos"
$falhou = $false

try {
  $nodeV = (node --version).TrimStart('v')
  if ([int]($nodeV.Split('.')[0]) -lt 18) { Erro "Node $nodeV - exigido 18+"; $falhou = $true }
  else { Ok "Node $nodeV" }
} catch { Erro "Node.js nao encontrado - https://nodejs.org"; $falhou = $true }

# JDK 17
$jdkOk = $false
try {
  $javaOut = (java -version 2>&1) -join ' '
  if ($javaOut -match '"?(\d+)[\.\"]') {
    $jv = [int]$Matches[1]
    if ($jv -eq 17) { Ok "JDK 17 no PATH"; $jdkOk = $true }
    else { Info "JDK $jv no PATH - o SDK 51 precisa do 17" }
  }
} catch { Info "Java nao encontrado no PATH" }

if (-not $jdkOk) {
  # tenta o JDK que vem com o Android Studio
  $jbr = @(
    "$env:ProgramFiles\Android\Android Studio\jbr",
    "$env:LOCALAPPDATA\Programs\Android Studio\jbr"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($jbr) {
    $env:JAVA_HOME = $jbr
    $env:Path = "$jbr\bin;$env:Path"
    Ok "Usando o JDK embutido do Android Studio: $jbr"
    $jdkOk = $true
  }
}
if (-not $jdkOk) {
  Erro "JDK 17 nao encontrado."
  Write-Host "        Opcao A: instale o Android Studio (traz JDK 17 em jbr\)" -ForegroundColor Yellow
  Write-Host "        Opcao B: baixe o Temurin 17 em https://adoptium.net" -ForegroundColor Yellow
  $falhou = $true
}

# Android SDK
$sdk = $env:ANDROID_HOME
if (-not $sdk) { $sdk = $env:ANDROID_SDK_ROOT }
if (-not $sdk) {
  $padrao = "$env:LOCALAPPDATA\Android\Sdk"
  if (Test-Path $padrao) { $sdk = $padrao; $env:ANDROID_HOME = $sdk; Info "ANDROID_HOME nao definido; usando $sdk" }
}
if ($sdk -and (Test-Path $sdk)) {
  Ok "Android SDK em $sdk"
  if (-not (Test-Path "$sdk\platforms\android-34")) {
    Erro "Falta a plataforma android-34."
    Write-Host "        No Android Studio: SDK Manager -> marque 'Android 14 (API 34)'" -ForegroundColor Yellow
    $falhou = $true
  } else { Ok "Plataforma android-34 presente" }
} else {
  Erro "Android SDK nao encontrado (defina ANDROID_HOME)."
  Write-Host "        Instale o Android Studio: https://developer.android.com/studio" -ForegroundColor Yellow
  $falhou = $true
}

if ($falhou) {
  Titulo "PRE-REQUISITOS AUSENTES"
  Write-Host "  Resolva os itens marcados como ERRO acima e rode de novo." -ForegroundColor Yellow
  Write-Host "  Se preferir nao instalar nada, use o build em nuvem:" -ForegroundColor Yellow
  Write-Host "      .\scripts\build-apk-nuvem.ps1" -ForegroundColor Cyan
  exit 1
}

# ---------- dependencias ----------
Titulo "2/5  Dependencias do projeto"
if (Test-Path "node_modules") { Ok "node_modules ja existe" }
else {
  Info "Baixando (~700 MB, alguns minutos)..."
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Erro "npm install falhou"; exit 1 }
  Ok "Instaladas"
}

# ---------- projeto nativo ----------
Titulo "3/5  Gerando o projeto Android nativo"
Info "expo prebuild recria a pasta android/ a partir de app.json"
npx expo prebuild --platform android --clean
if ($LASTEXITCODE -ne 0) { Erro "expo prebuild falhou"; exit 1 }
Ok "Pasta android/ gerada"

# ---------- compilacao ----------
Titulo "4/5  Compilando com o Gradle"
Info "Primeira execucao baixa o Gradle e as dependencias Android (~1 GB)."
Push-Location android
try {
  .\gradlew.bat assembleRelease --no-daemon
  $code = $LASTEXITCODE
} finally { Pop-Location }
if ($code -ne 0) { Erro "Gradle falhou - veja o log acima"; exit 1 }

# ---------- resultado ----------
Titulo "5/5  Resultado"
$apk = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apk) {
  $mb = [math]::Round((Get-Item $apk).Length / 1MB, 1)
  $destino = Join-Path $raiz "dist\CIRCUIT-MAPPER.apk"
  New-Item -ItemType Directory -Force -Path (Split-Path $destino) | Out-Null
  Copy-Item $apk $destino -Force
  Ok "APK gerado: $mb MB"
  Write-Host ""
  Write-Host "  Copiado para: dist\CIRCUIT-MAPPER.apk" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Para instalar pelo cabo USB (depuracao USB ativada no telefone):" -ForegroundColor Cyan
  Write-Host "      adb install -r `"$destino`"" -ForegroundColor White
  Write-Host "  Ou copie o arquivo para o celular e toque nele." -ForegroundColor Cyan
} else {
  Erro "A compilacao terminou sem erro, mas o APK nao foi encontrado em $apk"
  exit 1
}
