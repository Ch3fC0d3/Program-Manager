# Quick Database Fix - No Data Loss
# Syncs database with schema without resetting data

Write-Host "🔧 Quick Database Sync" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""

# Stop Node processes
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Clean Prisma client
Write-Host "Cleaning Prisma client..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue

# Push schema to database (safe, no data loss)
Write-Host ""
Write-Host "Syncing schema to database..." -ForegroundColor Yellow
Write-Host "(This is safe and won't delete your data)" -ForegroundColor Gray
npx prisma db push

# Generate client
Write-Host ""
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host ""
Write-Host "✅ Done! Start your dev server with: npm run dev" -ForegroundColor Green
