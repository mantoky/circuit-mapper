#!/usr/bin/env bash
# Equivalente do build local para Linux e macOS.
# Exige JDK 17, Android SDK (platform-34, build-tools 34) e ANDROID_HOME.
set -euo pipefail
cd "$(dirname "$0")/.."

titulo(){ printf '\n\033[90m%s\033[0m\n  \033[33m%s\033[0m\n\033[90m%s\033[0m\n' "$(printf '=%.0s' {1..66})" "$1" "$(printf '=%.0s' {1..66})"; }
ok(){   printf '  \033[32m[OK]\033[0m    %s\n' "$1"; }
erro(){ printf '  \033[31m[ERRO]\033[0m  %s\n' "$1"; }

titulo "CIRCUIT MAPPER - build local do APK"

falhou=0
command -v node >/dev/null || { erro "Node.js nao encontrado"; falhou=1; }
[ "$falhou" = 0 ] && ok "Node $(node --version)"

if command -v java >/dev/null; then
  jv=$(java -version 2>&1 | head -1 | grep -oE '[0-9]+' | head -1)
  [ "$jv" = "17" ] && ok "JDK 17" || { erro "JDK $jv encontrado; o SDK 51 exige o 17"; falhou=1; }
else erro "JDK 17 nao encontrado (https://adoptium.net)"; falhou=1; fi

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
if [ -n "$SDK" ] && [ -d "$SDK" ]; then
  ok "Android SDK em $SDK"
  [ -d "$SDK/platforms/android-34" ] && ok "Plataforma android-34" \
    || { erro "Falta a plataforma android-34 (SDK Manager)"; falhou=1; }
else erro "Defina ANDROID_HOME apontando para o Android SDK"; falhou=1; fi

if [ "$falhou" != 0 ]; then
  titulo "PRE-REQUISITOS AUSENTES"
  echo "  Alternativa sem instalar nada: eas build -p android --profile preview"
  exit 1
fi

titulo "Dependencias"
[ -d node_modules ] && ok "node_modules ja existe" || npm install --no-audit --no-fund

titulo "Projeto nativo"
npx expo prebuild --platform android --clean

titulo "Gradle"
( cd android && ./gradlew assembleRelease --no-daemon )

APK="android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK" ]; then
  mkdir -p dist && cp "$APK" dist/CIRCUIT-MAPPER.apk
  titulo "APK GERADO"
  ok "dist/CIRCUIT-MAPPER.apk ($(du -h dist/CIRCUIT-MAPPER.apk | cut -f1))"
  echo "  Instalar por USB:  adb install -r dist/CIRCUIT-MAPPER.apk"
else
  erro "APK nao encontrado em $APK"; exit 1
fi
