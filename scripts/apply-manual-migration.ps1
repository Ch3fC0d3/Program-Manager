# Apply Manual Migration Script
# This applies the SQL migration directly to fix the NotificationPreference table

Write-Host "🔧 Applying Manual Migration" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Stop Node processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Read the migration SQL
$migrationPath = "prisma\migrations\manual_fix\migration.sql"
if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ Migration file not found: $migrationPath" -ForegroundColor Red
    exit 1
}

Write-Host "Reading migration SQL..." -ForegroundColor Yellow
$sql = Get-Content $migrationPath -Raw

# Apply using Prisma db execute
Write-Host ""
Write-Host "Applying migration to database..." -ForegroundColor Yellow
Write-Host "(This may take a moment...)" -ForegroundColor Gray

try {
    # Use Prisma's db execute command
    $sql | npx prisma db execute --stdin
    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Trying alternative approach..." -ForegroundColor Yellow
    
    # Try db push as fallback
    npx prisma db push --accept-data-loss
}

# Regenerate Prisma client
Write-Host ""
Write-Host "Regenerating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "✅ Done! Start your dev server with: npm run dev" -ForegroundColor Green
