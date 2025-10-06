@echo off
echo Starting Congo Gaming Payout Services...
echo ========================================

echo.
echo Stopping existing containers...
docker-compose down

echo.
echo Starting PostgreSQL and Redis...
docker-compose up -d postgres redis

echo.
echo Waiting for services to start (15 seconds)...
timeout /t 15 /nobreak >nul

echo.
echo Services should be running. Checking status...
docker ps

echo.
echo ========================================
echo Services started!
echo.
echo If services are running, you can now:
echo 1. Run migrations: npx prisma migrate dev
echo 2. Seed database: npm run seed  
echo 3. Start API: npm run dev
echo 4. Start worker: npm run dev:worker
echo.
pause
