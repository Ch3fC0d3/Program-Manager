# Prisma Refresh Script
# This script safely regenerates the Prisma client by stopping processes and cleaning files

Write-Host "🔄 Prisma Client Refresh Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all Node processes
Write-Host "1️⃣  Stopping Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "   ✅ Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ℹ️  No Node.js processes running" -ForegroundColor Gray
}

# Step 2: Clean Prisma client directory
Write-Host ""
Write-Host "2️⃣  Cleaning Prisma client directory..." -ForegroundColor Yellow
$prismaPath = "node_modules\.prisma"
if (Test-Path $prismaPath) {
    Remove-Item -Recurse -Force $prismaPath -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cleaned $prismaPath" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  No Prisma client directory found" -ForegroundColor Gray
}

# Step 3: Regenerate Prisma client
Write-Host ""
Write-Host "3️⃣  Regenerating Prisma client..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "   ✅ Prisma client generated successfully" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to generate Prisma client" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Ask if user wants to run migrations
Write-Host ""
Write-Host "4️⃣  Database migrations..." -ForegroundColor Yellow
$runMigration = Read-Host "   Do you want to run migrations? (y/n)"
if ($runMigration -eq 'y' -or $runMigration -eq 'Y') {
    $migrationName = Read-Host "   Enter migration name (or press Enter for 'update_schema')"
    if ([string]::IsNullOrWhiteSpace($migrationName)) {
        $migrationName = "update_schema"
    }
    
    try {
        npx prisma migrate dev --name $migrationName
        Write-Host "   ✅ Migration completed successfully" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Migration failed" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped migrations" -ForegroundColor Gray
}

# Step 5: Ask if user wants to start dev server
Write-Host ""
Write-Host "5️⃣  Development server..." -ForegroundColor Yellow
$startDev = Read-Host "   Do you want to start the dev server? (y/n)"
if ($startDev -eq 'y' -or $startDev -eq 'Y') {
    Write-Host "   🚀 Starting dev server..." -ForegroundColor Cyan
    npm run dev
} else {
    Write-Host "   ⏭️  Skipped dev server start" -ForegroundColor Gray
}

Write-Host ""
Write-Host "✨ Done!" -ForegroundColor Green
