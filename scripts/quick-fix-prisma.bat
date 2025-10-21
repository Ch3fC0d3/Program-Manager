@echo off
REM Quick Prisma Fix Script (Windows Batch)
REM Stops processes, cleans, and regenerates Prisma client

echo.
echo ========================================
echo   Quick Prisma Client Fix
echo ========================================
echo.

echo [1/4] Stopping Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo       Done - Stopped Node.js processes
) else (
    echo       No Node.js processes running
)
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Cleaning Prisma client directory...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma"
    echo       Done - Cleaned .prisma directory
) else (
    echo       No .prisma directory found
)

echo.
echo [3/4] Regenerating Prisma client...
call npx prisma generate
if %errorlevel% equ 0 (
    echo       Done - Prisma client generated
) else (
    echo       ERROR - Failed to generate Prisma client
    pause
    exit /b 1
)

echo.
echo [4/4] All done!
echo.
echo You can now run: npm run dev
echo.
pause
