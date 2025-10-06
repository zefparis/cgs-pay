# SIMPLE RAILWAY DOCKERFILE
FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate && npm run build

# Start minimal version (no DB/Redis required)
CMD ["sh", "-c", "PORT=${PORT:-8080} node dist/index.minimal.js"]
