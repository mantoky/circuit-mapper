# Deploy VPS — Circuit Mapper (Windows/PowerShell)
# Empacota dist/ em tar e envia via SSH. A chave da VPS so aceita desempacotar no web root.
# Pre-requisitos: npm run build:web  +  deploy/.vps/config preenchido.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path "$PSScriptRoot\.."
Set-Location $root
if (-not (Test-Path "dist\CIRCUIT-MAPPER.html")) {
  throw "Bundle ausente. Rode 'npm run build:web' antes do deploy."
}
Write-Host "Enviando bundle para a VPS (circuit-mapper.techartsolucoes.com.br)..." -ForegroundColor Cyan
cmd /c "tar -czf - -C dist . | ssh -F deploy\.vps\config -o StrictHostKeyChecking=accept-new circuit-mapper-vps"
if ($LASTEXITCODE -eq 0) {
  Write-Host "[OK] Deploy concluido." -ForegroundColor Green
} else {
  throw "Falha no deploy (codigo $LASTEXITCODE). Verifique acesso SSH e deploy/.vps/config."
}
