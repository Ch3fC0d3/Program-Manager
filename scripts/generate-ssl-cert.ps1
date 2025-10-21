# Generate Self-Signed SSL Certificate for Local Development
# This script creates SSL certificates for HTTPS development

Write-Host "🔐 SSL Certificate Generator for Local Development" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Create certs directory if it doesn't exist
$certsDir = "certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
    Write-Host "✅ Created $certsDir directory" -ForegroundColor Green
}

# Check if OpenSSL is available
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue

if ($opensslPath) {
    Write-Host "✅ OpenSSL found at: $($opensslPath.Source)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Generating SSL certificate..." -ForegroundColor Yellow
    
    # Generate private key and certificate
    openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' `
        -keyout certs/localhost-key.pem -out certs/localhost.pem -days 365
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ SSL certificate generated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📁 Certificate files created:" -ForegroundColor Cyan
        Write-Host "   - certs/localhost.pem (Certificate)" -ForegroundColor White
        Write-Host "   - certs/localhost-key.pem (Private Key)" -ForegroundColor White
        Write-Host ""
        Write-Host "⚠️  IMPORTANT: Trust the certificate in your browser" -ForegroundColor Yellow
        Write-Host "   1. Open Chrome/Edge" -ForegroundColor White
        Write-Host "   2. Go to chrome://settings/certificates" -ForegroundColor White
        Write-Host "   3. Import certs/localhost.pem" -ForegroundColor White
        Write-Host "   4. Trust for 'localhost'" -ForegroundColor White
        Write-Host ""
        Write-Host "🚀 Next steps:" -ForegroundColor Cyan
        Write-Host "   1. Run: npm run dev:https" -ForegroundColor White
        Write-Host "   2. Visit: https://localhost:3000" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to generate certificate" -ForegroundColor Red
    }
} else {
    Write-Host "❌ OpenSSL not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📦 Installation options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1 - Chocolatey (Recommended):" -ForegroundColor Cyan
    Write-Host "   choco install openssl" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2 - Download directly:" -ForegroundColor Cyan
    Write-Host "   https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3 - Use mkcert (Easier):" -ForegroundColor Cyan
    Write-Host "   choco install mkcert" -ForegroundColor White
    Write-Host "   mkcert -install" -ForegroundColor White
    Write-Host "   mkcert localhost" -ForegroundColor White
    Write-Host ""
    Write-Host "After installing, run this script again." -ForegroundColor Yellow
}
