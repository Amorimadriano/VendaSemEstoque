# Script de Deploy para VendaSemEstoque -> Cloudflare Pages (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "=== Deploy VendaSemEstoque -> Cloudflare Pages ===" -ForegroundColor Cyan

# 1. Configurar caminhos do Node.js e Git Bash no PATH (necessário no Windows para ferramentas Cloudflare)
if (Test-Path "C:\nvm4w\nodejs") {
    $env:PATH = "C:\nvm4w\nodejs;C:\Program Files\Git\bin;C:\Program Files\Git\usr\bin;" + $env:PATH
}

# 2. Executar build local da aplicação (Prisma + Next.js)
Write-Host "1. Executando build da aplicação (Prisma + Next.js)..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha no build da aplicação."
    exit $LASTEXITCODE
}

# 3. Gerar saída otimizada para Cloudflare Pages
Write-Host "2. Gerando build do Cloudflare Pages (@cloudflare/next-on-pages)..." -ForegroundColor Yellow
npm run pages:build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Aviso: O build local do @cloudflare/next-on-pages possui limitações no Windows nativo." -ForegroundColor Yellow
    Write-Host "Recomendado: utilize a integração automática via GitHub ou GitHub Actions em ambiente Linux." -ForegroundColor Yellow
    exit $LASTEXITCODE
}

# 4. Publicar na Cloudflare via Wrangler
Write-Host "3. Publicando na Cloudflare via Wrangler..." -ForegroundColor Yellow
npx wrangler pages deploy .vercel/output/static

if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha no deploy para o Cloudflare."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "=== Deploy para Cloudflare concluído com sucesso! ===" -ForegroundColor Green
