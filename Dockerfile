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

 # Expose default port (Railway will inject PORT, but this helps detection)
 EXPOSE 8080

 # Safe defaults
 ENV NODE_ENV=production \
     HOST=0.0.0.0

# Start minimal version (no DB/Redis required)
CMD ["sh", "-c", "export PORT=${PORT:-8080}; echo 'Starting minimal server'; echo \"NODE_ENV=$NODE_ENV HOST=$HOST PORT=$PORT\"; ls -la dist || true; node dist/index.minimal.js"]
