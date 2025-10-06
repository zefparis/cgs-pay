Write-Host "🚀 Starting services on alternative ports..." -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "PostgreSQL: Port 5433 (instead of 5432)" -ForegroundColor Yellow
Write-Host "Redis: Port 6380 (instead of 6379)" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Yellow

# Stop any existing containers with our alternative names
Write-Host "Cleaning up any existing containers..." -ForegroundColor Yellow
docker stop postgres-alt redis-alt 2>$null | Out-Null
docker rm postgres-alt redis-alt 2>$null | Out-Null

# Start PostgreSQL on alternative port 5433
Write-Host "`nStarting PostgreSQL on port 5433..." -ForegroundColor Yellow
docker run -d `
  -p 5433:5432 `
  -e POSTGRES_USER=congo_user `
  -e POSTGRES_PASSWORD=congo_pass `
  -e POSTGRES_DB=congo_payout `
  --name postgres-alt `
  postgres:16-alpine

# Start Redis on alternative port 6380
Write-Host "Starting Redis on port 6380..." -ForegroundColor Yellow
docker run -d `
  -p 6380:6379 `
  --name redis-alt `
  redis:7-alpine

# Wait for services to start
Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test PostgreSQL
Write-Host "`nTesting PostgreSQL connection..." -ForegroundColor Yellow
$env:PGPASSWORD = "congo_pass"
docker exec postgres-alt psql -U congo_user -d congo_payout -c "SELECT 'Connected!' as status;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL is ready on port 5433!" -ForegroundColor Green
} else {
    Write-Host "⚠️  PostgreSQL might still be starting..." -ForegroundColor Yellow
}

# Test Redis
Write-Host "`nTesting Redis connection..." -ForegroundColor Yellow
$redisTest = docker exec redis-alt redis-cli ping 2>&1
if ($redisTest -match "PONG") {
    Write-Host "✅ Redis is ready on port 6380!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis might still be starting..." -ForegroundColor Yellow
}

# Backup current .env and use alternative
Write-Host "`nSwitching to alternative configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Copy-Item ".env" ".env.backup" -Force
    Write-Host "  Current .env backed up to .env.backup" -ForegroundColor Gray
}

Copy-Item ".env.alternative" ".env" -Force
Write-Host "  Using .env.alternative configuration" -ForegroundColor Gray

Write-Host "`n✅ Services are running on alternative ports!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run migrations: npx prisma migrate dev" -ForegroundColor White
Write-Host "2. Seed database: npm run seed" -ForegroundColor White
Write-Host "3. Start API: npm run dev" -ForegroundColor White
Write-Host "`nTo restore original configuration:" -ForegroundColor Yellow
Write-Host "  Copy-Item .env.backup .env -Force" -ForegroundColor White
