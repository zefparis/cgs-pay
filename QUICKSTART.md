# 🚀 Congo Gaming Payout Service - Quick Start Guide

## ✅ Setup Completed

The service has been successfully set up with the following fixes:

### Fixed Issues:
1. **TypeScript Compilation Errors**: Fixed Pino v10 logging syntax
2. **Prisma Schema**: Generated client and applied migrations
3. **Dependencies**: Updated vulnerable packages (npm audit fix)
4. **Database**: PostgreSQL container running with initial seed data

## 🔌 Services Running

| Service | Status | Port | Description |
|---------|--------|------|-------------|
| PostgreSQL | ✅ Running | 5432 | Database with migrations applied |
| Redis | ✅ Running | 6379 | Queue backend |
| API Server | ✅ Running | 8080 | Fastify REST API |
| Worker | ✅ Running | - | BullMQ job processor |

## 📊 Initial Data Seeded

### Investors:
- **Jean Dupont** (ID: investor-001) - Mobile Money, 15% share
- **Marie Martin** (ID: investor-002) - Bank Transfer, 10% share

### Provider Configs:
- **Thunes** (Sandbox) - Active
- **Rapyd** (Sandbox) - Configured

### SimSnapshot:
- Sample daily snapshot created for today

## 🧪 Test the API

### Using PowerShell (Windows):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\test-api.ps1
```

### Manual Testing:

1. **Health Check**:
```bash
curl http://localhost:8080/healthz
```

2. **Trigger Settlement (Dry Run)**:
```powershell
$payload = '{"dryRun":true}'
$secret = "dev-secret-change-in-production"
$signature = # Generate HMAC-SHA256

Invoke-RestMethod -Uri "http://localhost:8080/v1/settlements/close-day" `
  -Method Post `
  -Headers @{
    "Content-Type" = "application/json"
    "X-CG-Signature" = $signature
  } `
  -Body $payload
```

3. **View Metrics**:
```bash
curl http://localhost:8080/metrics
```

## 📁 Project Structure

```
congo-gaming-payout/
├── .env                    # Environment variables (created)
├── dist/                   # Compiled TypeScript (built)
├── node_modules/           # Dependencies (installed)
├── prisma/
│   └── migrations/         # Database schema (applied)
├── scripts/
│   ├── test-api.ps1        # PowerShell test script
│   └── quickstart.sh       # Setup script
└── src/                    # Source code (fixed)
```

## 🔧 Development Commands

```bash
# Database
npm run migrate:dev    # Run migrations
npm run seed          # Seed database
npm run studio        # Open Prisma Studio

# Development
npm run dev           # Start API server (with hot reload)
npm run dev:worker    # Start worker (with hot reload)

# Production
npm run build         # Compile TypeScript
npm start            # Start API server
npm run worker       # Start worker

# Docker
docker-compose up -d postgres redis  # Start databases
docker-compose down                   # Stop all containers
docker-compose logs -f               # View logs
```

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Health check |
| GET | `/metrics` | Prometheus metrics |
| POST | `/v1/settlements/close-day` | Trigger daily settlement |
| GET | `/v1/runs/{id}` | Get settlement details |
| GET | `/v1/runs` | List settlements |
| GET | `/v1/payouts/{id}` | Get payout details |
| GET | `/v1/payouts` | List payouts |
| POST | `/v1/payouts/{id}/retry` | Retry failed payout |
| POST | `/v1/providers/{name}/webhook` | Provider webhooks |

## 🔐 Security

- **Internal Auth**: Use `X-CG-Signature` header with HMAC-SHA256
- **Secret**: `dev-secret-change-in-production` (change in production!)
- **Dry Run Mode**: Enabled by default for safety

## 📝 Next Steps

1. **Production Deployment**:
   - Update `.env` with production values
   - Set `DRY_RUN_MODE=false`
   - Configure real provider credentials
   - Deploy to Railway

2. **Testing**:
   - Run the test script to verify all endpoints
   - Check Prisma Studio for database state
   - Monitor logs for job processing

3. **Integration**:
   - Configure real payment providers
   - Set up webhook endpoints
   - Implement monitoring/alerting

## 🆘 Troubleshooting

### Database Connection Issues:
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Port Already in Use:
```bash
# Find process using port 8080
netstat -ano | findstr :8080

# Kill process
taskkill /PID <PID> /F
```

### TypeScript Compilation Errors:
```bash
# Regenerate Prisma client
npx prisma generate

# Rebuild
npm run build
```

## ✨ Ready to Use!

The Congo Gaming Payout Service is now fully operational with:
- ✅ Database migrations applied
- ✅ Initial data seeded
- ✅ API server running
- ✅ Queue worker processing
- ✅ Health checks passing
- ✅ Metrics available

You can now trigger settlements, process payouts, and integrate with payment providers!
