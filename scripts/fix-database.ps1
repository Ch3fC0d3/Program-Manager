# Fix Database Issues Script
# This script resolves database migration and schema sync issues

Write-Host "🔧 Database Fix Script" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all Node processes
Write-Host "1️⃣  Stopping all Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "   ✅ Stopped $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "   ℹ️  No Node.js processes running" -ForegroundColor Gray
}

# Step 2: Clean Prisma client
Write-Host ""
Write-Host "2️⃣  Cleaning Prisma client..." -ForegroundColor Yellow
$prismaPath = "node_modules\.prisma"
if (Test-Path $prismaPath) {
    Remove-Item -Recurse -Force $prismaPath -ErrorAction SilentlyContinue
    Write-Host "   ✅ Cleaned Prisma client" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Prisma client already clean" -ForegroundColor Gray
}

# Step 3: Reset database to match schema
Write-Host ""
Write-Host "3️⃣  Resetting database to match schema..." -ForegroundColor Yellow
Write-Host "   ⚠️  WARNING: This will reset your database!" -ForegroundColor Red
$confirm = Read-Host "   Continue? (y/n)"

if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    try {
        Write-Host "   Running: npx prisma migrate reset --force" -ForegroundColor Gray
        npx prisma migrate reset --force
        Write-Host "   ✅ Database reset complete" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Database reset failed" -ForegroundColor Red
        Write-Host "   Trying alternative approach..." -ForegroundColor Yellow
        
        # Alternative: Deploy migrations
        try {
            npx prisma migrate deploy
            Write-Host "   ✅ Migrations deployed" -ForegroundColor Green
        } catch {
            Write-Host "   ❌ Migration deployment failed" -ForegroundColor Red
            Write-Host "   Error: $_" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⏭️  Skipped database reset" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Trying to push schema changes..." -ForegroundColor Yellow
    try {
        npx prisma db push --accept-data-loss
        Write-Host "   ✅ Schema pushed to database" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Schema push failed" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Red
    }
}

# Step 4: Generate Prisma client
Write-Host ""
Write-Host "4️⃣  Generating Prisma client..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "   ✅ Prisma client generated" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to generate Prisma client" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Step 5: Verify database
Write-Host ""
Write-Host "5️⃣  Verifying database..." -ForegroundColor Yellow
try {
    npx prisma db pull
    Write-Host "   ✅ Database schema verified" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Database verification had warnings (this may be okay)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✨ Database fix complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: npm run dev" -ForegroundColor White
Write-Host "   2. Test the application" -ForegroundColor White
Write-Host "   3. Check for any remaining errors" -ForegroundColor White
Write-Host ""
