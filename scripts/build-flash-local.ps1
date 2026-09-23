# Flash Report TI/LTE — gera build em D:\Desenvolvedor\APPs\Flash report ti-lte
param(
  [string]$OutDir = 'D:\Desenvolvedor\APPs\Flash report ti-lte'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host ''
Write-Host '  FLASH REPORT TI/LTE — BUILD LOCAL' -ForegroundColor Cyan
Write-Host "  Destino: $OutDir" -ForegroundColor Gray
Write-Host ''

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js nao encontrado. Instale Node 18+ e tente novamente.'
}

node tools/exportFlashBuild.js $OutDir
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host '  [OK] Arquivos gerados.' -ForegroundColor Green
Write-Host "  Abra: $OutDir\\FLASH-REPORT.html" -ForegroundColor Yellow
Write-Host ''

if (Test-Path $OutDir) {
  try { explorer.exe $OutDir } catch { }
}
