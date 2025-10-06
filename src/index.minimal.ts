import 'dotenv/config'
import { buildMinimalServer } from './server.minimal'
import { logger } from './lib/logger'

const PORT = parseInt(process.env.PORT || '8080', 10)
const HOST = process.env.HOST || '0.0.0.0'

async function start() {
  try {
    logger.info('Starting Congo Gaming Payout Service in MINIMAL mode')
    logger.info('No database or Redis required')
    
    const server = await buildMinimalServer()
    
    await server.listen({ port: PORT, host: HOST })
    
    logger.info(`✅ Server listening on ${HOST}:${PORT}`)
    logger.info(`🌐 Health check: http://localhost:${PORT}/healthz`)
    logger.info(`📊 Info: http://localhost:${PORT}/`)
    
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
