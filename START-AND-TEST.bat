@echo off
echo ============================================
echo Congo Gaming Payout Service - Quick Start
echo ============================================
echo.

echo Starting the API server in minimal mode...
echo (This works without Docker/PostgreSQL/Redis)
echo.

start /B npm run start:minimal

echo Waiting 8 seconds for server to start...
timeout /t 8 /nobreak >nul

echo.
echo Testing the API...
echo.

curl -s http://localhost:8080/
echo.
echo.

echo Testing health endpoint...
curl -s http://localhost:8080/healthz
echo.
echo.

echo ============================================
echo If you see JSON responses above, SUCCESS!
echo ============================================
echo.
echo The API is running at: http://localhost:8080
echo.
echo Available endpoints:
echo   http://localhost:8080/         (main info)
echo   http://localhost:8080/healthz  (health check)
echo   http://localhost:8080/readyz   (readiness)
echo   http://localhost:8080/metrics  (metrics)
echo.
echo Press any key to exit...
pause >nul
