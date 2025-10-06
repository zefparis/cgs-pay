Write-Host "🧹 Cleaning up and restarting services..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Stop and remove all containers with our names
Write-Host "`nRemoving existing containers..." -ForegroundColor Yellow
docker stop postgres-local redis-local congo-gaming-payout-postgres-1 congo-gaming-payout-redis-1 2>$null | Out-Null
docker rm postgres-local redis-local congo-gaming-payout-postgres-1 congo-gaming-payout-redis-1 2>$null | Out-Null

# Stop docker-compose services
Write-Host "Stopping docker-compose services..." -ForegroundColor Yellow
docker-compose down -v 2>$null | Out-Null

# Remove any orphaned containers using ports
Write-Host "Checking for containers using ports 5432 and 6379..." -ForegroundColor Yellow
$postgresContainer = docker ps -q --filter "publish=5432"
$redisContainer = docker ps -q --filter "publish=6379"

if ($postgresContainer) {
    Write-Host "Stopping container using port 5432..." -ForegroundColor Yellow
    docker stop $postgresContainer | Out-Null
    docker rm $postgresContainer | Out-Null
}

if ($redisContainer) {
    Write-Host "Stopping container using port 6379..." -ForegroundColor Yellow
    docker stop $redisContainer | Out-Null
    docker rm $redisContainer | Out-Null
}

# Wait a moment for ports to be released
Write-Host "`nWaiting for ports to be released..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start fresh containers using docker-compose
Write-Host "`nStarting fresh PostgreSQL and Redis containers..." -ForegroundColor Yellow
docker-compose up -d postgres redis

# Wait for services to be ready
Write-Host "`nWaiting for services to start (20 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# Show running containers
Write-Host "`n📦 Running containers:" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test PostgreSQL connection
Write-Host "`n🔍 Testing PostgreSQL connection..." -ForegroundColor Yellow
$testDb = docker exec congo-gaming-payout-postgres-1 psql -U congo_user -d congo_payout -c "SELECT 'Connected!' as status;" 2>&1
if ($testDb -match "Connected") {
    Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
} else {
    Write-Host "⚠️  PostgreSQL might not be ready yet. Error:" -ForegroundColor Yellow
    Write-Host $testDb -ForegroundColor Red
}

# Test Redis connection  
Write-Host "`n🔍 Testing Redis connection..." -ForegroundColor Yellow
$testRedis = docker exec congo-gaming-payout-redis-1 redis-cli ping 2>&1
if ($testRedis -match "PONG") {
    Write-Host "✅ Redis is ready!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis might not be ready yet" -ForegroundColor Yellow
}

Write-Host "`n✅ Services should be running now!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Run migrations: npx prisma migrate dev" -ForegroundColor White
Write-Host "2. Seed database: npm run seed" -ForegroundColor White
Write-Host "3. Start API: npm run dev" -ForegroundColor White
Write-Host "`nIf you still have issues, try running in standalone mode:" -ForegroundColor Yellow
Write-Host "  npm run start:standalone" -ForegroundColor White
