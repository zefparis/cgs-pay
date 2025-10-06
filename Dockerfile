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

# Force port 8080 for Railway
CMD ["sh", "-c", "export PORT=8080 && node dist/index.js"]
