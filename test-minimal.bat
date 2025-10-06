@echo off
echo ============================================
echo Testing Minimal API Server
echo ============================================
echo.

echo Waiting for server to start...
timeout /t 3 /nobreak >nul

echo Testing health endpoint...
curl -s http://localhost:8080/healthz
echo.
echo.

echo Testing info endpoint...
curl -s http://localhost:8080/
echo.
echo.

echo ============================================
echo If you see JSON responses above, it works!
echo ============================================
pause
