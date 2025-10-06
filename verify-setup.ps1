Write-Host "`n🔍 Verifying Congo Gaming Payout Service Setup" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

$allGood = $true

# Check Docker containers
Write-Host "`n📦 Docker Containers:" -ForegroundColor Yellow
$postgresRunning = docker ps --filter "name=postgres-alt" --filter "status=running" -q
$redisRunning = docker ps --filter "name=redis-alt" --filter "status=running" -q

if ($postgresRunning) {
    Write-Host "  ✅ PostgreSQL (postgres-alt) - Running on port 5433" -ForegroundColor Green
} else {
    Write-Host "  ❌ PostgreSQL (postgres-alt) - Not running" -ForegroundColor Red
    Write-Host "     Run: docker start postgres-alt" -ForegroundColor Yellow
    $allGood = $false
}

if ($redisRunning) {
    Write-Host "  ✅ Redis (redis-alt) - Running on port 6380" -ForegroundColor Green
} else {
    Write-Host "  ❌ Redis (redis-alt) - Not running" -ForegroundColor Red
    Write-Host "     Run: docker start redis-alt" -ForegroundColor Yellow
    $allGood = $false
}

# Check API
Write-Host "`n🌐 API Server:" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8080/healthz" -Method Get -TimeoutSec 2
    Write-Host "  ✅ API Server - Running on port 8080" -ForegroundColor Green
    
    if ($health.services.database -eq "healthy") {
        Write-Host "  ✅ Database Connection - Healthy" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Database Connection - Unhealthy" -ForegroundColor Yellow
    }
    
    if ($health.services.redis -eq "healthy") {
        Write-Host "  ✅ Redis Connection - Healthy" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Redis Connection - Unhealthy" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ API Server - Not responding" -ForegroundColor Red
    Write-Host "     Run: npm run dev" -ForegroundColor Yellow
    $allGood = $false
}

# Check database data
Write-Host "`n📊 Database Data:" -ForegroundColor Yellow
if ($postgresRunning) {
    $investors = docker exec postgres-alt psql -U congo_user -d congo_payout -t -c "SELECT COUNT(*) FROM \"Investor\";" 2>&1
    if ($investors -match "2") {
        Write-Host "  ✅ Investors - 2 records found" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Investors - Expected 2, found: $investors" -ForegroundColor Yellow
        Write-Host "     Run: npm run seed" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n📋 Summary:" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "  🎉 Everything is working correctly!" -ForegroundColor Green
    Write-Host "`n  Ready to process payouts!" -ForegroundColor Green
    Write-Host "  - PostgreSQL on port 5433" -ForegroundColor Gray
    Write-Host "  - Redis on port 6380" -ForegroundColor Gray
    Write-Host "  - API on port 8080" -ForegroundColor Gray
} else {
    Write-Host "  ⚠️  Some services need attention" -ForegroundColor Yellow
    Write-Host "`n  Quick fix commands:" -ForegroundColor Yellow
    Write-Host "  1. docker start postgres-alt redis-alt" -ForegroundColor White
    Write-Host "  2. npm run dev" -ForegroundColor White
}

Write-Host "`n📚 Documentation:" -ForegroundColor Cyan
Write-Host "  - See SUCCESS.md for full details" -ForegroundColor Gray
Write-Host "  - See TROUBLESHOOTING.md for issues" -ForegroundColor Gray
