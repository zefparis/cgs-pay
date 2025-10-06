import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/prisma'
import { createProvider } from '../providers/factory'
import { logger } from '../lib/logger'
import { PayoutStatus } from '@prisma/client'

const WebhookParamsSchema = z.object({
  name: z.enum(['thunes', 'rapyd']),
})

export const providerRoutes: FastifyPluginAsync = async (server) => {
  // Provider webhook endpoint
  server.post('/providers/:name/webhook', {
    schema: {
      params: WebhookParamsSchema,
    },
    config: {
      rateLimit: {
        max: 100,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const { name } = request.params as z.infer<typeof WebhookParamsSchema>
    const rawBody = request.body as Buffer
    
    logger.info({
      msg: 'Webhook received',
      provider: name,
      headers: request.headers,
    })
    
    try {
      // Get provider
      const provider = createProvider(name.toUpperCase())
      
      // Verify signature
      const isValid = provider.verifySignature(
        request.headers as Record<string, string>,
        rawBody
      )
      
      if (!isValid) {
        logger.error({
          msg: 'Webhook signature verification failed',
          provider: name,
        })
        return reply.status(401).send({ error: 'Invalid signature' })
      }
      
      // Parse webhook
      const parsed = provider.parseWebhook(JSON.parse(rawBody.toString()))
      
      logger.info({
        msg: 'Webhook parsed',
        provider: name,
        externalId: parsed.externalId,
        status: parsed.status,
      })
      
      // Find payout instruction by external ID
      const payout = await prisma.payoutInstruction.findFirst({
        where: { externalId: parsed.externalId },
      })
      
      if (!payout) {
        logger.error({
          msg: 'Payout not found for webhook',
          externalId: parsed.externalId,
        })
        return reply.status(404).send({ error: 'Payout not found' })
      }
      
      // Update payout status
      const newStatus: PayoutStatus = parsed.status === 'SETTLED' 
        ? PayoutStatus.SETTLED 
        : PayoutStatus.FAILED
      
      await prisma.payoutInstruction.update({
        where: { id: payout.id },
        data: {
          status: newStatus,
          providerMessage: parsed.providerMessage,
        },
      })
      
      logger.info({
        msg: 'Payout status updated',
        payoutId: payout.id,
        oldStatus: payout.status,
        newStatus,
      })
      
      // Update settlement run status if needed
      if (newStatus === PayoutStatus.FAILED) {
        const runPayouts = await prisma.payoutInstruction.findMany({
          where: { runId: payout.runId },
        })
        
        const hasFailures = runPayouts.some(p => p.status === PayoutStatus.FAILED)
        const allSettled = runPayouts.every(p => 
          p.status === PayoutStatus.SETTLED || p.status === PayoutStatus.FAILED
        )
        
        if (allSettled && hasFailures) {
          await prisma.settlementRun.update({
            where: { id: payout.runId },
            data: { status: 'PARTIAL' },
          })
        }
      }
      
      return reply.send({
        success: true,
        payoutId: payout.id,
        status: newStatus,
      })
    } catch (error) {
      logger.error({
        msg: 'Webhook processing failed',
        provider: name,
        error: error instanceof Error ? error.message : error,
      })
      return reply.status(500).send({ error: 'Webhook processing failed' })
    }
  })
  
  // Get provider status
  server.get('/providers/:name/status', {
    schema: {
      params: WebhookParamsSchema,
    },
  }, async (request, reply) => {
    const { name } = request.params as z.infer<typeof WebhookParamsSchema>
    
    const config = await prisma.providerConfig.findUnique({
      where: { name: name.toUpperCase() as any },
    })
    
    if (!config) {
      return reply.status(404).send({ error: 'Provider not found' })
    }
    
    // Get payout statistics
    const stats = await prisma.payoutInstruction.groupBy({
      by: ['status'],
      where: { provider: name.toUpperCase() as any },
      _count: true,
      _sum: {
        amount: true,
      },
    })
    
    return reply.send({
      provider: name,
      active: config.active,
      walletCurrency: config.walletCurrency,
      statistics: stats.map(s => ({
        status: s.status,
        count: s._count,
        totalAmount: s._sum.amount,
      })),
    })
  })
}
