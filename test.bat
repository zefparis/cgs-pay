@echo off
echo Testing Congo Gaming Payout API...
echo.

curl -s http://localhost:8080/healthz
if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS - API is running!
) else (
    echo.
    echo FAILED - API is not responding
    echo.
    echo Please run: npm run start:standalone
)

pause
