Write-Host "🚀 Starting Congo Gaming Payout Services" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`nChecking Docker status..." -ForegroundColor Yellow
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Stop existing containers
Write-Host "`nStopping existing containers..." -ForegroundColor Yellow
docker-compose down -v 2>$null | Out-Null

# Start PostgreSQL and Redis
Write-Host "`nStarting PostgreSQL and Redis..." -ForegroundColor Yellow
docker-compose up -d postgres redis

# Wait for services to be ready
Write-Host "`nWaiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check container status
Write-Host "`nContainer Status:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test PostgreSQL connection
Write-Host "`nTesting PostgreSQL connection..." -ForegroundColor Yellow
$env:PGPASSWORD = "congo_pass"
docker exec -it congo-gaming-payout-postgres-1 psql -U congo_user -d congo_payout -c "SELECT 1" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
} else {
    Write-Host "⚠️ PostgreSQL might not be ready yet" -ForegroundColor Yellow
}

# Test Redis connection
Write-Host "`nTesting Redis connection..." -ForegroundColor Yellow
docker exec -it congo-gaming-payout-redis-1 redis-cli ping 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Redis is ready" -ForegroundColor Green
} else {
    Write-Host "⚠️ Redis might not be ready yet" -ForegroundColor Yellow
}

Write-Host "`n✅ Services started!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Run migrations: npx prisma migrate dev" -ForegroundColor White
Write-Host "2. Seed database: npm run seed" -ForegroundColor White
Write-Host "3. Start API: npm run dev" -ForegroundColor White
Write-Host "4. Start worker: npm run dev:worker" -ForegroundColor White
