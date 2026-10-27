@echo off
setlocal
title WOW THAILAND -- Service Stopper

echo ============================================================
echo   WOW THAILAND -- SERVICE STOPPER
echo   Terminating active services on ports 5000 and 5173...
echo ============================================================
echo.

powershell -NoProfile -Command "$ports = @(5000, 5173); $stopped = 0; foreach ($p in $ports) { try { $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; if ($proc.ProcessName -eq 'node') { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('  [OK] Stopped Node.js process on port ' + $p + ' (PID: ' + $c.OwningProcess + ')'); $stopped++ } else { Write-Host ('  [SKIP] Process on port ' + $p + ' is ' + $proc.ProcessName + ' (not node), skipping.') } } } catch {} }; if ($stopped -eq 0) { Write-Host '  [INFO] No active Node.js servers found on ports 5000 or 5173.' } else { Write-Host ('`n[SUCCESS] Stopped ' + $stopped + ' WOW THAILAND server process(es).') }"

echo.
echo Operation completed.
ping 127.0.0.1 -n 3 >nul
exit /b 0
