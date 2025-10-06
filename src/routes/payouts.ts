import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/prisma'
import { payoutQueue } from '../jobs/queue'
import { payoutCounter } from './metrics'
import { logger } from '../lib/logger'

const RetryPayoutSchema = z.object({
  id: z.string().uuid(),
})

const ListPayoutsSchema = z.object({
  investorId: z.string().uuid().optional(),
  runId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'SUBMITTED', 'SETTLED', 'FAILED']).optional(),
  limit: z.number().min(1).max(100).default(10),
  offset: z.number().min(0).default(0),
})

export const payoutRoutes: FastifyPluginAsync = async (server) => {
  // Retry a failed payout
  server.post('/payouts/:id/retry', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id'],
        additionalProperties: false
      }
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof RetryPayoutSchema>
    
    const payout = await prisma.payoutInstruction.findUnique({
      where: { id },
    })
    
    if (!payout) {
      return reply.status(404).send({ error: 'Payout not found' })
    }
    
    if (payout.status === 'SETTLED') {
      return reply.status(400).send({ 
        error: 'Payout already settled',
        externalId: payout.externalId,
      })
    }
    
    // Reset status to pending if failed
    if (payout.status === 'FAILED') {
      await prisma.payoutInstruction.update({
        where: { id },
        data: { status: 'PENDING' },
      })
    }
    
    // Enqueue retry job
    const job = await payoutQueue.add('submit', {
      payoutInstructionId: id,
      retryAttempt: payout.retryCount + 1,
    })
    
    logger.info({
      msg: 'Payout retry enqueued',
      payoutId: id,
      jobId: job.id,
      retryAttempt: payout.retryCount + 1,
    })
    
    return reply.send({
      payoutId: id,
      jobId: job.id,
      status: 'RETRY_ENQUEUED',
    })
  })
  
  // Get payout details
  server.get('/payouts/:id', {
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }
        },
        required: ['id'],
        additionalProperties: false
      }
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof RetryPayoutSchema>
    
    const payout = await prisma.payoutInstruction.findUnique({
      where: { id },
      include: {
        investor: {
          select: {
            id: true,
            name: true,
            phoneOrIban: true,
            walletType: true,
            currency: true,
            kycStatus: true,
          },
        },
        run: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true,
            status: true,
          },
        },
      },
    })
    
    if (!payout) {
      return reply.status(404).send({ error: 'Payout not found' })
    }
    
    return reply.send({
      id: payout.id,
      investor: {
        id: payout.investor.id,
        name: payout.investor.name,
        walletType: payout.investor.walletType,
        currency: payout.investor.currency,
        kycStatus: payout.investor.kycStatus,
      },
      amount: payout.amount,
      currency: payout.currency,
      fee: payout.fee,
      fxRate: payout.fxRate,
      provider: payout.provider,
      status: payout.status,
      externalId: payout.externalId,
      providerMessage: payout.providerMessage,
      retryCount: payout.retryCount,
      run: payout.run,
      createdAt: payout.createdAt,
      updatedAt: payout.updatedAt,
    })
  })
  
  // List payouts with filters
  server.get('/payouts', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          investorId: { type: 'string', format: 'uuid' },
          runId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['PENDING', 'SUBMITTED', 'SETTLED', 'FAILED'] },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 10 },
          offset: { type: 'number', minimum: 0, default: 0 }
        },
        additionalProperties: false
      }
    },
  }, async (request, reply) => {
    const query = request.query as z.infer<typeof ListPayoutsSchema>
    
    const where: any = {}
    if (query.investorId) where.investorId = query.investorId
    if (query.runId) where.runId = query.runId
    if (query.status) where.status = query.status
    
    const [payouts, total] = await Promise.all([
      prisma.payoutInstruction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
        include: {
          investor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.payoutInstruction.count({ where }),
    ])
    
    // Update metrics
    const statusCounts = await prisma.payoutInstruction.groupBy({
      by: ['status', 'provider'],
      _count: true,
    })
    
    statusCounts.forEach(count => {
      payoutCounter.labels(count.status, count.provider).inc(0) // Reset and set
    })
    
    return reply.send({
      payouts: payouts.map(p => ({
        id: p.id,
        investor: p.investor.name,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        externalId: p.externalId,
        createdAt: p.createdAt,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    })
  })
}
