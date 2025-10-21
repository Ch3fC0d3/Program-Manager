@echo off
setlocal

REM Navigate to project root
cd /d "%~dp0.."

set PROJECT_NAME=Project Management App

echo Starting %PROJECT_NAME%...

REM Ensure dependencies are installed
if not exist "node_modules" (
  echo Installing dependencies...
  call npm install
)

REM Optional: run database setup
if "%1"=="--setup-db" (
  echo Running database setup...
  call npm run db:setup
)

echo Launching development server (Ctrl+C to stop)...
call npm run dev

endlocal
