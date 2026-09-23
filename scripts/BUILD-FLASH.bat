@echo off
setlocal
title Flash Report TI/LTE — Build
cd /d "%~dp0.."

echo.
echo  ==================================================================
echo    FLASH REPORT TI/LTE — GERAR BUILD LOCAL
echo  ==================================================================
echo.
echo    Pasta de saida padrao:
echo    D:\Desenvolvedor\APPs\Flash report ti-lte
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-flash-local.ps1"
echo.
pause
