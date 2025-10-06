# 🔧 Fix Instructions - Congo Gaming Payout Service

## Current Issue
The database connection is failing because of port conflicts or authentication issues.

## ✅ Solution - Use Standalone Mode (Recommended)

This mode works **without Redis** and handles database connection failures gracefully.

### Step 1: Open a new terminal
```bash
cd C:\Users\ia-solution\CascadeProjects\congo-gaming-payout
```

### Step 2: Run standalone mode
```bash
npm run start:standalone
```

This will start the API server on port 8080 without requiring Redis.

## 🔄 Alternative - Fix Docker Setup

If you want the full setup with Redis and workers:

### Step 1: Check what's using ports
Open Command Prompt as Administrator and run:
```bash
netstat -ano | findstr :5432
netstat -ano | findstr :6379
```

### Step 2: Kill conflicting processes
If you see processes using these ports, note the PID and kill them:
```bash
taskkill /PID [PID_NUMBER] /F
```

### Step 3: Start fresh containers
```bash
# Remove all containers
docker stop $(docker ps -aq)
docker rm $(docker ps -aq)

# Start with alternative ports
docker run -d -p 5433:5432 -e POSTGRES_USER=congo_user -e POSTGRES_PASSWORD=congo_pass -e POSTGRES_DB=congo_payout --name pg-congo postgres:16-alpine
docker run -d -p 6380:6379 --name redis-congo redis:7-alpine
```

### Step 4: Update .env file
Make sure your `.env` file has:
```env
DATABASE_URL=postgresql://congo_user:congo_pass@localhost:5433/congo_payout?schema=public
REDIS_URL=redis://localhost:6380
```

### Step 5: Run migrations
```bash
npx prisma migrate dev
npm run seed
```

### Step 6: Start the server
```bash
npm run dev
```

## 🧪 Test the API

Once running, test with:
```bash
curl http://localhost:8080/healthz
```

Or open in browser: http://localhost:8080/healthz

## 📊 Expected Response

When working correctly, you should see:
```json
{
  "status": "ok",
  "timestamp": "2024-10-06T13:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

## 🚀 Quick Commands Summary

### Option A - Standalone (No Docker/Redis needed)
```bash
npm run start:standalone
```

### Option B - Full Setup
```bash
# Terminal 1 - Start services
docker start postgres-alt redis-alt

# Terminal 2 - Start API
npm run dev

# Terminal 3 - Start worker (optional)
npm run dev:worker
```

## 🆘 Still Having Issues?

1. **Restart your computer** to clear all port conflicts
2. **Use WSL2** if on Windows for better Docker support
3. **Install PostgreSQL locally** instead of Docker
4. **Use the standalone mode** - it's the simplest solution!

## ✨ Standalone Mode Benefits

- ✅ No Docker required
- ✅ No Redis required  
- ✅ Handles connection failures gracefully
- ✅ Perfect for development and testing
- ✅ All API endpoints work (except background jobs)

The standalone mode is perfect for testing the API and development work!
