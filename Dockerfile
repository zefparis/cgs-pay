# ULTRA SIMPLE DOCKERFILE FOR RAILWAY
FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy everything
COPY package*.json ./
COPY prisma ./prisma/
COPY dist ./dist/

# Install production deps and generate Prisma
RUN npm ci --production && npx prisma generate

# Start app directly - NO MIGRATIONS
CMD ["node", "dist/index.js"]
