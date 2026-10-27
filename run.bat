@echo off
setlocal enabledelayedexpansion
title WOW THAILAND -- Unified Launcher

echo ============================================================
echo   WOW THAILAND -- TRAVEL AND PLATFORM LAUNCHER
echo   Independent Node.js + Express + React + MySQL Stack
echo ============================================================
echo.

set ROOT_DIR=%~dp0
set BACKEND_DIR=%ROOT_DIR%backend
set FRONTEND_DIR=%ROOT_DIR%frontend

:: 1. Check Node.js installation
echo [1/6] Checking Node.js and npm installation...
where node >nul 2>&1
if errorlevel 1 goto ERR_NO_NODE

where npm >nul 2>&1
if errorlevel 1 goto ERR_NO_NPM

for /f "tokens=*" %%i in ('node -v 2^>nul') do set "NODE_VER=%%i"
for /f "tokens=*" %%i in ('npm -v 2^>nul') do set "NPM_VER=%%i"
echo   -- Node.js detected: !NODE_VER!
echo   -- npm detected:     v!NPM_VER!

:: 2. Check Backend Environment Configuration
echo [2/6] Checking backend configuration...
if not exist "%BACKEND_DIR%\.env" goto ERR_NO_ENV
echo   -- backend\.env verified

:: 3. Check Dependencies
echo [3/6] Checking dependencies...
if not exist "%BACKEND_DIR%\node_modules\" (
    echo   -- Installing backend dependencies...
    cd /d "%BACKEND_DIR%"
    call npm install
    if errorlevel 1 goto ERR_BACKEND_NPM
)
if not exist "%FRONTEND_DIR%\node_modules\" (
    echo   -- Installing frontend dependencies...
    cd /d "%FRONTEND_DIR%"
    call npm install
    if errorlevel 1 goto ERR_FRONTEND_NPM
)
echo   -- Dependencies verified

:: 4. Check whether WOW THAILAND services are already active
echo [4/6] Checking server ports 5000 and 5173...
set BACKEND_RUNNING=0
set FRONTEND_RUNNING=0

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/v1/health' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200 -and $r.Content -like '*WOW THAILAND API*') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    set BACKEND_RUNNING=1
    echo   -- WOW THAILAND backend is already running on port 5000.
) else (
    echo   -- Freeing port 5000 for WOW THAILAND backend...
    powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
)

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5173' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200 -and $r.Content -like '*WOW THAILAND*') { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    set FRONTEND_RUNNING=1
    echo   -- WOW THAILAND frontend is already running on port 5173.
) else (
    echo   -- Freeing port 5173 from other projects (e.g. Goa) for WOW THAILAND...
    powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
)

:: 5. Start Backend and Frontend in separate terminal windows
echo [5/6] Starting services in separate terminal windows...
if "!BACKEND_RUNNING!"=="0" (
    echo   -- Launching Node.js Backend on http://localhost:5000 ...
    start "WOW THAILAND Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && npm start"
) else (
    echo   -- Node.js Backend is already running on port 5000.
)

if "!FRONTEND_RUNNING!"=="0" (
    echo   -- Launching React + Vite Frontend on http://localhost:5173 ...
    start "WOW THAILAND Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"
) else (
    echo   -- React Frontend is already running on port 5173.
)

:: 6. Health check: Wait until services are ready
echo [6/6] Waiting for services to become ready...
set ATTEMPTS=0
:WAIT_LOOP
set /a ATTEMPTS+=1
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/v1/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto SERVICES_READY

if !ATTEMPTS! geq 25 goto WAIT_TIMEOUT

ping 127.0.0.1 -n 2 >nul
goto WAIT_LOOP

:WAIT_TIMEOUT
echo.
echo [WARNING] Backend took longer than expected to report healthy.
echo Please inspect the "WOW THAILAND Backend" terminal window for error messages.
goto LAUNCH_BROWSER

:SERVICES_READY
echo   -- Backend is healthy and responding on http://localhost:5000/api/v1/health
ping 127.0.0.1 -n 3 >nul

:LAUNCH_BROWSER
echo.
echo ============================================================
echo   READY! Opening WOW THAILAND in your default browser...
echo   Frontend URL:  http://localhost:5173
echo   Backend API:   http://localhost:5000/api/v1/health
echo   Compat Router: http://localhost:5000/api.php
echo ============================================================
echo.
start http://localhost:5173

echo WOW THAILAND is running.
echo To STOP all services gracefully, press any key in this window or run stop.bat.
echo.
pause

:: Shutdown routine when user presses any key in the launcher
echo.
echo Stopping WOW THAILAND services...
powershell -NoProfile -Command "$ports = @(5000, 5173); foreach ($p in $ports) { try { $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; if ($proc.ProcessName -eq 'node') { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } } } catch {} }" >nul 2>&1
echo WOW THAILAND services stopped cleanly.
ping 127.0.0.1 -n 3 >nul
exit /b 0

:: ============================================================
:: ERROR HANDLERS (Label-based to avoid parenthesizing syntax bugs)
:: ============================================================
:ERR_NO_NODE
echo.
echo [ERROR] Node.js is not installed or not in PATH.
echo Please install Node.js v18 or higher from https://nodejs.org/
echo.
pause
exit /b 1

:ERR_NO_NPM
echo.
echo [ERROR] npm is not installed or not in PATH.
echo Please ensure Node.js and npm are properly added to your PATH environment variable.
echo.
pause
exit /b 1

:ERR_NO_ENV
echo.
echo [ERROR] Backend environment file not found: %BACKEND_DIR%\.env
echo Please create %BACKEND_DIR%\.env from %BACKEND_DIR%\.env.example before launching.
echo.
pause
exit /b 1

:ERR_BACKEND_NPM
echo.
echo [ERROR] Failed to install backend dependencies in %BACKEND_DIR%.
echo.
pause
exit /b 1

:ERR_FRONTEND_NPM
echo.
echo [ERROR] Failed to install frontend dependencies in %FRONTEND_DIR%.
echo.
pause
exit /b 1
