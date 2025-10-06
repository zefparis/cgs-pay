import fastify, { FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { logger } from './lib/logger'

export async function buildMinimalServer(): Promise<FastifyInstance> {
  const server = fastify({
    logger: logger as any,
    bodyLimit: 1048576,
    trustProxy: true,
  })
  
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || false,
  })
  
  await server.register(helmet, {
    contentSecurityPolicy: false,
  })
  
  // Simple health check
  server.get('/healthz', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mode: 'minimal',
      message: 'API server is running in minimal mode (no database/Redis required)',
    })
  })
  
  // Readiness check
  server.get('/readyz', async (_request, reply) => {
    return reply.send({
      ready: true,
      timestamp: new Date().toISOString(),
    })
  })
  
  // Simple metrics endpoint
  server.get('/metrics', async (_request, reply) => {
    return reply.send('# Congo Gaming Payout Service - Minimal Mode\n# No metrics available in minimal mode\n')
  })
  
  // Info endpoint
  server.get('/', async (_request, reply) => {
    return reply.send({
      service: 'Congo Gaming Payout Service',
      version: '1.0.0',
      mode: 'minimal',
      endpoints: {
        health: '/healthz',
        ready: '/readyz',
        metrics: '/metrics',
      },
      message: 'This is a minimal version running without database or Redis dependencies.',
      note: 'To run the full version, ensure PostgreSQL and Redis are running and use: npm run dev',
    })
  })
  
  // Error handler
  server.setErrorHandler((error, request, reply) => {
    server.log.error({
      msg: 'Request error',
      error: error.message,
      url: request.url,
      method: request.method,
    })
    
    return reply.status(error.statusCode || 500).send({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    })
  })
  
  return server
}
