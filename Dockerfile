# SIMPLE RAILWAY DOCKERFILE
FROM node:20-alpine
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files AND prisma schema
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (Prisma needs schema for postinstall)
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Start minimal version (no DB/Redis required)
CMD ["sh", "-c", "PORT=${PORT:-8080} node dist/index.minimal.js"]
