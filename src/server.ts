import fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { logger } from './lib/logger'
import { healthRoutes } from './routes/health'
import { metricsRoutes } from './routes/metrics'
import { settlementRoutes } from './routes/settlements'
import { payoutRoutes } from './routes/payouts'
import { providerRoutes } from './routes/providers'

export async function buildServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: logger as any,
    bodyLimit: 1048576, // 1MB
    trustProxy: true,
  })
  
  // Register plugins
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || false,
  })
  
  await server.register(helmet, {
    contentSecurityPolicy: false,
  })
  
  await server.register(rateLimit, {
    global: false,
  })
  
  // Error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error({
      msg: 'Request error',
      error: error.message,
      url: request.url,
      method: request.method,
    })
    
    if (error.validation) {
      return reply.status(400).send({
        error: 'Validation error',
        message: error.message,
      })
    }
    
    return reply.status(error.statusCode || 500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    })
  })
  
  // Register routes
  await server.register(healthRoutes, { prefix: '/' })
  await server.register(metricsRoutes, { prefix: '/' })
  await server.register(settlementRoutes, { prefix: '/v1' })
  await server.register(payoutRoutes, { prefix: '/v1' })
  await server.register(providerRoutes, { prefix: '/v1' })
  
  return server
}
