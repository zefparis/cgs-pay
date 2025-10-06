import 'dotenv/config'
import { buildServer } from './server'
import { connectDB } from './db/prisma'
import { startWorkers } from './jobs/queue'
import { logger } from './lib/logger'

const PORT = parseInt(process.env.PORT || '8080', 10)
const HOST = process.env.HOST || '0.0.0.0'

async function start() {
  try {
    // Try to connect to database (non-blocking)
    try {
      await connectDB()
      logger.info('Database connected successfully')
    } catch (dbError) {
      logger.warn({ error: dbError }, 'Database connection failed - continuing without DB')
    }
    
    // Start queue workers only if DB is available
    if (process.env.WORKER_ENABLED !== 'false') {
      try {
        startWorkers()
      } catch (workerError) {
        logger.warn({ error: workerError }, 'Workers failed to start - continuing without workers')
      }
    }
    
    // Build and start server
    const server = await buildServer()
    
    await server.listen({ port: PORT, host: HOST })
    
    logger.info(`Server listening on ${HOST}:${PORT}`)
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`)
      await server.close()
      process.exit(0)
    }
    
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (error) {
    logger.error({ error }, 'Failed to start server')
    process.exit(1)
  }
}

start()
