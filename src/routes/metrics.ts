import { FastifyPluginAsync } from 'fastify'
import { register, collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client'
import { prisma } from '../db/prisma'

// Initialize default metrics
collectDefaultMetrics({ prefix: 'cg_payout_' })

// Custom metrics
const httpRequestDuration = new Histogram({
  name: 'cg_payout_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
})

const payoutCounter = new Counter({
  name: 'cg_payout_processed_total',
  help: 'Total number of payouts processed',
  labelNames: ['status', 'provider'],
})

const settlementGauge = new Gauge({
  name: 'cg_payout_pending_settlements',
  help: 'Number of pending settlements',
})

export { httpRequestDuration, payoutCounter, settlementGauge }

export const metricsRoutes: FastifyPluginAsync = async (server) => {
  // Add request timing middleware
  server.addHook('onRequest', (request, _reply, done) => {
    (request as any).startTime = Date.now()
    done()
  })
  
  server.addHook('onResponse', (request, reply, done) => {
    const duration = (Date.now() - ((request as any).startTime || Date.now())) / 1000
    httpRequestDuration
      .labels(request.method, request.url, reply.statusCode.toString())
      .observe(duration)
    done()
  })
  
  server.get('/metrics', async (_request, reply) => {
    try {
      // Update settlement gauge
      const pendingCount = await prisma.settlementRun.count({
        where: { status: 'DRAFT' },
      })
      settlementGauge.set(pendingCount)
      
      // Get Prometheus metrics
      const metrics = await register.metrics()
      
      reply
        .header('Content-Type', register.contentType)
        .send(metrics)
    } catch (error) {
      server.log.error({ error }, 'Failed to collect metrics')
      return reply.status(500).send({ error: 'Failed to collect metrics' })
    }
  })
}
