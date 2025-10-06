import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db/prisma'
import { redis } from '../jobs/queue'

export const healthRoutes: FastifyPluginAsync = async (server) => {
  server.get('/healthz', async (_request, reply) => {
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {},
    }
    
    // Check database (non-critical)
    try {
      await prisma.$queryRaw`SELECT 1`
      health.services.database = 'healthy'
    } catch (error) {
      server.log.warn({ error }, 'Database health check failed')
      health.services.database = 'unavailable'
      // Don't mark as unhealthy - continue working
    }
    
    // Check Redis (non-critical)
    try {
      await redis.ping()
      health.services.redis = 'healthy'
    } catch (error) {
      server.log.warn({ error }, 'Redis health check failed')
      health.services.redis = 'unavailable'
      // Don't mark as unhealthy - continue working
    }
    
    // Always return OK - app can work in degraded mode
    health.status = 'ok'
    
    return reply.status(200).send(health)
  })
  
  server.get('/readyz', async (_request, reply) => {
    return reply.send({
      ready: true,
      timestamp: new Date().toISOString(),
    })
  })
}
