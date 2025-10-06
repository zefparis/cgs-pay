#!/bin/bash

# Congo Gaming Payout Service - Quick Start Script

set -e

echo "🚀 Congo Gaming Payout Service - Quick Start"
echo "============================================"

# Check Node.js version
echo "📌 Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 20 ]; then
    echo "❌ Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version OK: $(node -v)"

# Check if Docker is installed
echo "📌 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. Skipping Docker setup."
    USE_DOCKER=false
else
    echo "✅ Docker found"
    USE_DOCKER=true
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Setup environment
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Starting Docker services..."
    docker-compose up -d postgres redis
    
    # Wait for services
    echo "⏳ Waiting for services to start..."
    sleep 5
    
    # Run migrations
    echo "🗄️ Running database migrations..."
    npx prisma migrate dev --name init
    
    # Seed database
    echo "🌱 Seeding database..."
    npm run seed
    
    echo "✅ Services started with Docker"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Start the API server: npm run dev"
    echo "  2. Start the worker: npm run dev:worker"
    echo "  3. View database: npm run studio"
    echo "  4. View logs: docker-compose logs -f"
else
    echo ""
    echo "📋 Next steps (without Docker):"
    echo "  1. Install PostgreSQL and Redis locally"
    echo "  2. Update DATABASE_URL and REDIS_URL in .env"
    echo "  3. Run migrations: npm run migrate:dev"
    echo "  4. Seed database: npm run seed"
    echo "  5. Start the API server: npm run dev"
    echo "  6. Start the worker: npm run dev:worker"
fi

echo ""
echo "🎉 Setup complete! Check README.md for API documentation."
