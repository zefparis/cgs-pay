import 'dotenv/config'
import { connectDB, disconnectDB } from './db/prisma'
import { startWorkers, stopWorkers } from './jobs/queue'
import { logger } from './lib/logger'

async function start() {
  try {
    logger.info('Starting queue worker...')
    
    // Connect to database
    await connectDB()
    
    // Start workers
    startWorkers()
    
    logger.info('Queue worker started successfully')
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down worker gracefully...`)
      await stopWorkers()
      await disconnectDB()
      process.exit(0)
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (error) {
    logger.error({ error }, 'Failed to start queue worker')
    process.exit(1)
  }
}

start()
