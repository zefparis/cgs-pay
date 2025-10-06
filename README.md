# Congo Gaming - Automated Investor Payout Microservice

A production-ready Node.js + TypeScript microservice for automated daily settlement and investor payouts for Congo Gaming. Built with Fastify, PostgreSQL, Redis, and BullMQ for robust, scalable financial operations.

## 🚀 Features

- **Automated Daily Settlement**: Calculates NGR, taxes, marketing, and investor payouts
- **Double-Entry Ledger**: Immutable financial audit trail
- **Multi-Provider Support**: Integrated with Thunes and Rapyd for disbursements
- **Idempotent Operations**: Safe retries with exponential backoff
- **Webhook Processing**: Real-time payout status updates
- **Comprehensive Metrics**: Prometheus metrics and health checks
- **KYC Compliance**: Automatic payout freezing for unverified investors
- **Flexible Payout Rules**: Daily/weekly/monthly frequencies with thresholds

## 📋 Requirements

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## 🛠️ Tech Stack

- **Runtime**: Node.js 20 + TypeScript 5
- **Framework**: Fastify 4
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ (Redis)
- **Testing**: Vitest
- **Monitoring**: Prometheus metrics
- **Logging**: Pino
- **Validation**: Zod

## 📦 Installation

### Local Development

```bash
# Clone repository
git clone https://github.com/congo-gaming/payout-service.git
cd payout-service

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app worker

# Stop services
docker-compose down
```

## 🚂 Railway Deployment

### 1. Prerequisites
- Railway account
- PostgreSQL and Redis add-ons provisioned

### 2. Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Link to existing project (if applicable)
railway link [project-id]

# Deploy
railway up
```

### 3. Environment Variables

Set these in Railway dashboard:

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
PORT=8080
NODE_ENV=production

CG_INTERNAL_SECRET=your-secure-secret

# Provider Configuration
PROVIDER=THUNES
THUNES_BASE_URL=https://api.thunes.com
THUNES_KEY=your-key
THUNES_SECRET=your-secret

# Financial Parameters
DEFAULT_TAXES_PCT=20
DEFAULT_MARKETING_PCT=20
DEFAULT_INVESTOR_SHARE_PCT=25
DEFAULT_PAYOUT_FEES_PCT=1.2
DEFAULT_MARKET_MULTIPLIER=30
```

### 4. Database Migration

```bash
# Run migrations on Railway
railway run npx prisma migrate deploy
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | Required |
| `PORT` | Server port | 8080 |
| `NODE_ENV` | Environment (development/production) | development |
| `CG_INTERNAL_SECRET` | Internal API authentication secret | Required |
| `PROVIDER` | Payment provider (THUNES/RAPYD) | THUNES |
| `DRY_RUN_MODE` | Enable dry-run mode (no real payouts) | false |
| `DEFAULT_TAXES_PCT` | Tax percentage | 20 |
| `DEFAULT_MARKETING_PCT` | Marketing budget percentage | 20 |
| `DEFAULT_INVESTOR_SHARE_PCT` | Default investor share | 25 |

## 📡 API Endpoints

### Settlements

#### Close Day
```bash
curl -X POST http://localhost:8080/v1/settlements/close-day \
  -H "Content-Type: application/json" \
  -H "X-CG-Signature: $(echo -n '{}' | openssl dgst -sha256 -hmac 'your-secret' -binary | xxd -p)" \
  -d '{
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-01-02T00:00:00Z",
    "dryRun": false
  }'
```

#### Get Settlement Run
```bash
curl http://localhost:8080/v1/runs/{runId}
```

### Payouts

#### Retry Failed Payout
```bash
curl -X POST http://localhost:8080/v1/payouts/{payoutId}/retry
```

#### Get Payout Status
```bash
curl http://localhost:8080/v1/payouts/{payoutId}
```

#### List Payouts
```bash
curl "http://localhost:8080/v1/payouts?status=PENDING&limit=10"
```

### Provider Webhooks

#### Thunes Webhook
```bash
POST /v1/providers/thunes/webhook
Headers:
  X-Thunes-Signature: {hmac_signature}
  X-Thunes-Timestamp: {timestamp}
Body:
{
  "transaction_id": "TXN-123",
  "status": "completed",
  "amount": 1000,
  "currency": "EUR"
}
```

#### Rapyd Webhook
```bash
POST /v1/providers/rapyd/webhook
Headers:
  Signature: {signature}
  Salt: {salt}
  Timestamp: {timestamp}
Body:
{
  "id": "webhook-123",
  "type": "payout.completed",
  "data": {
    "id": "PAYOUT-456",
    "status": "CLO",
    "amount": 1000,
    "currency": "EUR"
  }
}
```

### Health & Metrics

```bash
# Health check
curl http://localhost:8080/healthz

# Readiness check
curl http://localhost:8080/readyz

# Prometheus metrics
curl http://localhost:8080/metrics
```

## 💼 Business Logic

### Settlement Calculation

```typescript
// Monthly settlement formula
Stake = MAU × %payers × ARPPU × MarketMultiplier
GGR = Stake × (1 - Payout%)
NGR = GGR - Bonuses - Fees
Taxes = NGR × 20%
Marketing = NGR × 20%
NGR_net = NGR - Taxes - Marketing - FixedOpex
InvestorPayout = NGR_net × 25% (default)
CompanyTake = NGR_net - InvestorPayout - CapexAmort
```

### Payout Rules

1. **KYC Verification**: Only verified investors receive payouts
2. **Minimum Threshold**: Default €100 minimum
3. **Frequency**: Daily, weekly, or monthly based on agreement
4. **Retries**: 5 attempts with exponential backoff
5. **Idempotency**: Duplicate requests are safely ignored

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- calc.test.ts
```

## 📊 Monitoring

### Metrics Available

- `cg_payout_http_request_duration_seconds`: HTTP request latency
- `cg_payout_processed_total`: Total payouts by status
- `cg_payout_pending_settlements`: Pending settlement count
- Default Node.js process metrics

### Logging

Structured JSON logging with Pino:

```json
{
  "level": "info",
  "time": 1704067200000,
  "msg": "Payout submitted successfully",
  "payoutInstructionId": "123",
  "externalId": "THUNES-456",
  "fee": 12.50
}
```

## 🔒 Security

1. **HMAC Authentication**: All internal endpoints require signature
2. **Rate Limiting**: Provider webhooks limited to 100/minute
3. **PII Redaction**: Phone numbers and IBANs are masked in logs
4. **Environment Isolation**: Separate configs for dev/staging/prod
5. **Non-root Docker**: Containers run as non-privileged user

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### Redis Connection Failed
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
redis-cli -u $REDIS_URL ping
```

#### Webhook Signature Verification Failed
```bash
# Verify secret is correct
echo $THUNES_SECRET

# Test signature generation
echo -n "payload" | openssl dgst -sha256 -hmac "secret" -binary | xxd -p
```

## 📚 Database Schema

Key tables:
- `Investor`: Investor profiles with KYC status
- `InvestorAgreement`: Payout terms and percentages
- `SettlementRun`: Daily settlement batches
- `PayoutInstruction`: Individual payout records
- `LedgerEntry`: Double-entry accounting entries
- `SimSnapshot`: Gaming metrics snapshots

## 🚀 Production Checklist

- [ ] Set strong `CG_INTERNAL_SECRET`
- [ ] Configure production provider credentials
- [ ] Enable SSL/TLS for database connections
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Review and adjust rate limits
- [ ] Enable audit logging
- [ ] Set up error tracking (Sentry)
- [ ] Configure auto-scaling policies
- [ ] Document runbooks for operations

## 📝 License

© 2024 Congo Gaming. All rights reserved.

## 🤝 Support

For issues or questions:
- Email: tech@congogaming.com
- Slack: #payout-service
- Documentation: https://docs.congogaming.com/payout

---

Built with ❤️ by Congo Gaming Engineering Team
