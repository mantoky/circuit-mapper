@echo off
setlocal enabledelayedexpansion
title Circuit Mapper - Gerar APK
cd /d "%~dp0.."

REM ---- comprimento do caminho (limite MAX_PATH do Windows) ----
set "RAIZ=%CD%"
call :strlen RAIZ LEN
echo.
echo  ==================================================================
echo    CIRCUIT MAPPER - GERAR APK
echo  ==================================================================
echo.
echo    Pasta do projeto: %RAIZ%
echo    Comprimento do caminho: %LEN% caracteres
echo.
if %LEN% GTR 120 (
  echo    [AVISO] Caminho longo demais para o node_modules do React Native.
  echo            O Windows corta em 260 caracteres e o npm install vai falhar.
  echo            Copie a pasta para algo curto, por exemplo C:\Projetos\, e
  echo            rode o BUILD-APK.bat de lah.
  echo.
  echo            O script PowerShell oferece fazer essa copia automaticamente.
  echo.
)

echo    [1] Nuvem da Expo  - nao instala nada aqui, precisa de conta Expo
echo        (recomendado; a compilacao roda nos servidores da Expo)
echo.
echo    [2] Local          - precisa de JDK 17 + Android Studio/SDK
echo        (nao depende de conta nem de nuvem)
echo.
set /p opcao="   Escolha 1 ou 2: "
echo.
if "%opcao%"=="1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-apk-nuvem.ps1"
) else if "%opcao%"=="2" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-apk-local.ps1"
) else (
  echo    Opcao invalida.
)
echo.
pause
goto :eof

:strlen
setlocal enabledelayedexpansion
set "s=!%~1!#"
set "len=0"
for %%A in (4096 2048 1024 512 256 128 64 32 16 8 4 2 1) do (
  if "!s:~%%A!" NEQ "" (
    set /a len+=%%A
    set "s=!s:~%%A!"
  )
)
endlocal & set "%~2=%len%"
goto :eof
