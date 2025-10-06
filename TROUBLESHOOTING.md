# 🔧 Troubleshooting Guide - Congo Gaming Payout Service

## ⚠️ Current Issues

### 1. Redis Connection Error (ECONNREFUSED 127.0.0.1:6379)
**Problem**: Redis server is not running or not accessible on port 6379.

**Solutions**:

#### Option A: Start Redis with Docker
```batch
# Run the provided batch file
start-local.bat

# OR manually start Redis
docker run -d -p 6379:6379 --name redis-local redis:7-alpine
```

#### Option B: Install Redis locally (Windows)
1. Download Redis for Windows from: https://github.com/microsoftarchive/redis/releases
2. Extract and run `redis-server.exe`
3. Keep the terminal window open

#### Option C: Use WSL (Windows Subsystem for Linux)
```bash
# In WSL terminal
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### 2. PostgreSQL Authentication Error
**Problem**: Database credentials are incorrect or PostgreSQL is not running.

**Solutions**:

#### Option A: Use Docker PostgreSQL
```batch
# Start PostgreSQL container
docker run -d ^
  -p 5432:5432 ^
  -e POSTGRES_USER=congo_user ^
  -e POSTGRES_PASSWORD=congo_pass ^
  -e POSTGRES_DB=congo_payout ^
  --name postgres-local ^
  postgres:16-alpine
```

#### Option B: Update .env with correct credentials
```env
# If using different PostgreSQL instance, update:
DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?schema=public
```

## 🚀 Quick Fix - Run Without External Services

### Standalone Mode (No Redis/Workers)
```bash
# This runs the API without queue workers
npm run start:standalone
```

This mode:
- ✅ Starts the API server
- ✅ Serves health endpoints
- ⚠️ No background job processing
- ⚠️ No real-time settlement processing

## 📝 Step-by-Step Recovery

### 1. Check Docker Status
```powershell
docker version
docker ps -a
```

If Docker is not running:
- Open Docker Desktop
- Wait for it to fully start
- Try again

### 2. Clean Start Services
```powershell
# Remove all containers and volumes
docker-compose down -v

# Start fresh
docker-compose up -d postgres redis

# Wait 15 seconds for services to start
Start-Sleep -Seconds 15

# Check status
docker ps
```

### 3. Verify Services
```powershell
# Test PostgreSQL
docker exec -it congo-gaming-payout-postgres-1 psql -U congo_user -d congo_payout -c "SELECT 1"

# Test Redis
docker exec -it congo-gaming-payout-redis-1 redis-cli ping
```

### 4. Apply Migrations
```bash
npx prisma migrate dev
npm run seed
```

### 5. Start Application
```bash
# Terminal 1 - API Server
npm run dev

# Terminal 2 - Worker (optional)
npm run dev:worker
```

## 🔍 Common Issues & Solutions

### Port Already in Use
```powershell
# Find what's using port 5432 (PostgreSQL)
netstat -ano | findstr :5432

# Find what's using port 6379 (Redis)
netstat -ano | findstr :6379

# Kill process by PID
taskkill /PID [PID_NUMBER] /F
```

### Docker Not Starting
1. Ensure virtualization is enabled in BIOS
2. Check Windows Features:
   - Hyper-V
   - Windows Subsystem for Linux
   - Virtual Machine Platform
3. Restart Docker Desktop
4. Run as Administrator

### Permission Denied
```powershell
# Run PowerShell as Administrator
# Then execute Docker commands
```

## 🆘 Alternative: Run Everything Locally

### Without Docker
1. **Install PostgreSQL**: https://www.postgresql.org/download/windows/
2. **Install Redis**: https://github.com/microsoftarchive/redis/releases
3. **Create Database**:
   ```sql
   CREATE USER congo_user WITH PASSWORD 'congo_pass';
   CREATE DATABASE congo_payout OWNER congo_user;
   ```
4. **Update .env**:
   ```env
   DATABASE_URL=postgresql://congo_user:congo_pass@localhost:5432/congo_payout?schema=public
   REDIS_URL=redis://localhost:6379
   ```

## 📊 Health Check

Once services are running, verify:
```bash
# Check health endpoint
curl http://localhost:8080/healthz

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-10-06T12:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

## 🔄 Full Reset

If nothing works, complete reset:
```bash
# 1. Stop everything
docker-compose down -v
npm cache clean --force

# 2. Reinstall
rm -rf node_modules
npm install

# 3. Regenerate Prisma
npx prisma generate

# 4. Start fresh
docker-compose up -d postgres redis
npx prisma migrate dev
npm run seed
npm run dev
```

## 📞 Still Having Issues?

1. Check logs:
   ```bash
   docker-compose logs postgres
   docker-compose logs redis
   ```

2. Verify environment variables:
   ```bash
   npm run env-check
   ```

3. Run diagnostic script:
   ```powershell
   .\scripts\diagnose.ps1
   ```

## ✅ Success Indicators

When everything is working:
- ✅ `docker ps` shows 2 running containers
- ✅ Health endpoint returns status "ok"
- ✅ No connection errors in console
- ✅ Can access Prisma Studio: `npm run studio`
- ✅ API responds on http://localhost:8080

Remember: The service can run in **standalone mode** without Redis for basic testing!
