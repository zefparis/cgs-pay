import { PrismaClient } from '@prisma/client'
import { logger } from '../lib/logger'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export async function connectDB(): Promise<void> {
  try {
    await prisma.$connect()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error({ error }, 'Database connection failed')
    throw error
  }
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect()
  logger.info('Database disconnected')
}
