import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { prisma } from '../db/prisma'
import { settlementQueue } from '../jobs/queue'
import { verifyHmacSignature } from '../lib/crypto'
import { logger } from '../lib/logger'

dayjs.extend(utc)

const CloseDaySchema = z.object({
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  dryRun: z.boolean().optional(),
})

const GetRunSchema = z.object({
  id: z.string().uuid(),
})

export const settlementRoutes: FastifyPluginAsync = async (server) => {
  // Close day and trigger settlement
  server.post('/settlements/close-day', {
    schema: {
      body: {
        type: 'object',
        properties: {
          periodStart: { type: 'string', format: 'date-time' },
          periodEnd: { type: 'string', format: 'date-time' },
          dryRun: { type: 'boolean' }
        },
        additionalProperties: false
      }
    },
  }, async (request, reply) => {
    // Verify internal auth
    const signature = request.headers['x-cg-signature'] as string
    const secret = process.env.CG_INTERNAL_SECRET || ''
    
    if (!signature || !verifyHmacSignature(JSON.stringify(request.body), signature, secret)) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
    
    const { periodStart, periodEnd, dryRun = false } = request.body as z.infer<typeof CloseDaySchema>
    
    // Default to previous UTC day
    const end = periodEnd ? dayjs(periodEnd).utc() : dayjs().utc().startOf('day')
    const start = periodStart ? dayjs(periodStart).utc() : end.subtract(1, 'day')
    
    // Check for existing run
    const existingRun = await prisma.settlementRun.findFirst({
      where: {
        periodStart: start.toDate(),
        periodEnd: end.toDate(),
        status: {
          in: ['FINALIZED', 'PAID'],
        },
      },
    })
    
    if (existingRun) {
      return reply.status(409).send({
        error: 'Settlement already exists',
        runId: existingRun.id,
      })
    }
    
    // Enqueue settlement job
    const job = await settlementQueue.add('close-day', {
      periodStart: start.toDate(),
      periodEnd: end.toDate(),
      dryRun,
    })
    
    logger.info({
      msg: 'Settlement job enqueued',
      jobId: job.id,
      periodStart: start.format(),
      periodEnd: end.format(),
    })
    
    return reply.send({
      jobId: job.id,
      periodStart: start.format(),
      periodEnd: end.format(),
      dryRun,
    })
  })
  
  // Get settlement run details
  server.get('/runs/:id', {
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
    const { id } = request.params as z.infer<typeof GetRunSchema>
    
    const run = await prisma.settlementRun.findUnique({
      where: { id },
      include: {
        ledgers: {
          orderBy: { ts: 'asc' },
        },
        payouts: {
          include: {
            investor: {
              select: {
                id: true,
                name: true,
                currency: true,
              },
            },
          },
        },
        snapshot: true,
      },
    })
    
    if (!run) {
      return reply.status(404).send({ error: 'Settlement run not found' })
    }
    
    // Parse totals JSON
    const totals = JSON.parse(run.totalsJson as string)
    
    return reply.send({
      id: run.id,
      periodStart: run.periodStart,
      periodEnd: run.periodEnd,
      status: run.status,
      totals,
      ledgerCount: run.ledgers.length,
      payouts: run.payouts.map(p => ({
        id: p.id,
        investor: p.investor.name,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        externalId: p.externalId,
      })),
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    })
  })
  
  // List settlement runs
  server.get('/runs', async (request, reply) => {
    const { limit = 10, offset = 0, status } = request.query as any
    
    const where = status ? { status } : {}
    
    const [runs, total] = await Promise.all([
      prisma.settlementRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          _count: {
            select: {
              payouts: true,
              ledgers: true,
            },
          },
        },
      }),
      prisma.settlementRun.count({ where }),
    ])
    
    return reply.send({
      runs: runs.map(run => ({
        id: run.id,
        periodStart: run.periodStart,
        periodEnd: run.periodEnd,
        status: run.status,
        payoutCount: run._count.payouts,
        ledgerCount: run._count.ledgers,
        createdAt: run.createdAt,
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    })
  })
}
