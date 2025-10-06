# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# Production stage  
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --production && npx prisma generate
COPY --from=builder /app/dist ./dist

# Start app with full error logging
CMD ["sh", "-c", "echo 'App starting...' && echo 'NODE_ENV:' $NODE_ENV && echo 'DATABASE_URL:' $DATABASE_URL && echo 'REDIS_URL:' $REDIS_URL && echo 'PORT:' $PORT && node dist/index.js 2>&1"]
