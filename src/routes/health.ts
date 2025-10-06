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
    
    let allHealthy = true
    
    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`
      health.services.database = 'healthy'
    } catch (error) {
      server.log.warn({ error }, 'Database health check failed')
      health.services.database = 'unhealthy'
      allHealthy = false
    }
    
    // Check Redis
    try {
      await redis.ping()
      health.services.redis = 'healthy'
    } catch (error) {
      server.log.warn({ error }, 'Redis health check failed')
      health.services.redis = 'unhealthy'
      allHealthy = false
    }
    
    health.status = allHealthy ? 'ok' : 'degraded'
    
    return reply.status(allHealthy ? 200 : 503).send(health)
  })
  
  server.get('/readyz', async (_request, reply) => {
    return reply.send({
      ready: true,
      timestamp: new Date().toISOString(),
    })
  })
}
