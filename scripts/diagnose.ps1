Write-Host "`n🔍 Congo Gaming Payout Service - Diagnostic Tool" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check Node version
Write-Host "`n📌 Node.js Version:" -ForegroundColor Yellow
node -v

# Check npm version
Write-Host "`n📌 NPM Version:" -ForegroundColor Yellow
npm -v

# Check Docker
Write-Host "`n📌 Docker Status:" -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker version | Select-Object -First 2
    $dockerRunning = $true
    Write-Host "✅ Docker is installed and running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running or not installed" -ForegroundColor Red
}

if ($dockerRunning) {
    Write-Host "`n📌 Docker Containers:" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    $postgresRunning = docker ps --filter "name=postgres" --filter "status=running" -q
    $redisRunning = docker ps --filter "name=redis" --filter "status=running" -q
    
    if ($postgresRunning) {
        Write-Host "✅ PostgreSQL container is running" -ForegroundColor Green
    } else {
        Write-Host "❌ PostgreSQL container is not running" -ForegroundColor Red
    }
    
    if ($redisRunning) {
        Write-Host "✅ Redis container is running" -ForegroundColor Green
    } else {
        Write-Host "❌ Redis container is not running" -ForegroundColor Red
    }
}

# Check ports
Write-Host "`n📌 Port Availability:" -ForegroundColor Yellow
$ports = @(5432, 6379, 8080)
foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connection) {
        Write-Host "✅ Port $port is in use (service likely running)" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Port $port is not in use" -ForegroundColor Yellow
    }
}

# Check environment file
Write-Host "`n📌 Environment Configuration:" -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    $envContent = Get-Content ".env" | Where-Object { $_ -match "^[^#].*=" }
    $dbUrl = $envContent | Where-Object { $_ -match "^DATABASE_URL" }
    $redisUrl = $envContent | Where-Object { $_ -match "^REDIS_URL" }
    
    if ($dbUrl) {
        Write-Host "  DATABASE_URL is configured" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ DATABASE_URL is missing" -ForegroundColor Red
    }
    
    if ($redisUrl) {
        Write-Host "  REDIS_URL is configured" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ REDIS_URL is missing" -ForegroundColor Red
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

# Check node_modules
Write-Host "`n📌 Dependencies:" -ForegroundColor Yellow
if (Test-Path "node_modules") {
    $moduleCount = (Get-ChildItem "node_modules" -Directory).Count
    Write-Host "✅ node_modules exists ($moduleCount packages)" -ForegroundColor Green
} else {
    Write-Host "❌ node_modules not found - run 'npm install'" -ForegroundColor Red
}

# Check Prisma
Write-Host "`n📌 Prisma Client:" -ForegroundColor Yellow
if (Test-Path "node_modules\.prisma") {
    Write-Host "✅ Prisma client is generated" -ForegroundColor Green
} else {
    Write-Host "❌ Prisma client not generated - run 'npx prisma generate'" -ForegroundColor Red
}

# Check build
Write-Host "`n📌 Build Status:" -ForegroundColor Yellow
if (Test-Path "dist") {
    $buildFiles = (Get-ChildItem "dist" -Recurse -File).Count
    Write-Host "✅ Build directory exists ($buildFiles files)" -ForegroundColor Green
} else {
    Write-Host "⚠️ Build directory not found - run 'npm run build'" -ForegroundColor Yellow
}

# Recommendations
Write-Host "`n💡 Recommendations:" -ForegroundColor Cyan

if (-not $dockerRunning) {
    Write-Host "1. Start Docker Desktop" -ForegroundColor White
    Write-Host "2. Run: docker-compose up -d postgres redis" -ForegroundColor White
} elseif (-not $postgresRunning -or -not $redisRunning) {
    Write-Host "1. Start services: docker-compose up -d postgres redis" -ForegroundColor White
}

if (-not (Test-Path ".env")) {
    Write-Host "1. Copy .env.example to .env" -ForegroundColor White
    Write-Host "2. Update database credentials" -ForegroundColor White
}

if (-not (Test-Path "node_modules")) {
    Write-Host "1. Run: npm install" -ForegroundColor White
}

if (-not (Test-Path "node_modules\.prisma")) {
    Write-Host "1. Run: npx prisma generate" -ForegroundColor White
}

Write-Host "`n🚀 Quick Start Commands:" -ForegroundColor Cyan
Write-Host "  docker-compose up -d postgres redis  # Start services" -ForegroundColor Gray
Write-Host "  npm install                          # Install dependencies" -ForegroundColor Gray
Write-Host "  npx prisma migrate dev               # Run migrations" -ForegroundColor Gray
Write-Host "  npm run seed                         # Seed database" -ForegroundColor Gray
Write-Host "  npm run dev                          # Start API server" -ForegroundColor Gray
Write-Host "  npm run start:standalone             # Start without Redis" -ForegroundColor Gray

Write-Host "`n📝 For detailed help, see TROUBLESHOOTING.md" -ForegroundColor Yellow
