import { Decimal } from 'decimal.js'
import { prisma } from '../db/prisma'
import { createProvider } from '../providers/factory'
import { logger } from '../lib/logger'
import { PayoutStatus } from '@prisma/client'

export interface PayoutJobData {
  payoutInstructionId: string
  retryAttempt?: number
}

export async function processPayoutJob(data: PayoutJobData): Promise<void> {
  const { payoutInstructionId, retryAttempt = 0 } = data
  
  logger.info({
    msg: 'Processing payout',
    payoutInstructionId,
    retryAttempt,
  })
  
  try {
    // Get payout instruction
    const payoutInstruction = await prisma.payoutInstruction.findUnique({
      where: { id: payoutInstructionId },
      include: {
        investor: true,
      },
    })
    
    if (!payoutInstruction) {
      throw new Error(`Payout instruction not found: ${payoutInstructionId}`)
    }
    
    // Check if already processed
    if (payoutInstruction.status === PayoutStatus.SETTLED) {
      logger.warn({
        msg: 'Payout already settled',
        payoutInstructionId,
        externalId: payoutInstruction.externalId,
      })
      return
    }
    
    // Check if already submitted
    if (payoutInstruction.status === PayoutStatus.SUBMITTED && payoutInstruction.externalId) {
      logger.info({
        msg: 'Payout already submitted, waiting for webhook',
        payoutInstructionId,
        externalId: payoutInstruction.externalId,
      })
      return
    }
    
    // Get provider
    const provider = createProvider(payoutInstruction.provider)
    
    // Submit payout to provider
    const result = await provider.submitPayout({
      idempotencyKey: payoutInstruction.idempotencyKey,
      amount: new Decimal(payoutInstruction.amount).toNumber(),
      currency: payoutInstruction.currency,
      beneficiary: {
        name: payoutInstruction.investor.name,
        phoneOrIban: payoutInstruction.investor.phoneOrIban,
        walletType: payoutInstruction.investor.walletType,
        country: 'CD',
      },
    })
    
    // Update payout instruction with result
    await prisma.payoutInstruction.update({
      where: { id: payoutInstructionId },
      data: {
        status: PayoutStatus.SUBMITTED,
        externalId: result.externalId,
        fee: new Decimal(result.fee),
        fxRate: new Decimal(result.fxRate || 1),
        retryCount: retryAttempt,
      },
    })
    
    logger.info({
      msg: 'Payout submitted successfully',
      payoutInstructionId,
      externalId: result.externalId,
      fee: result.fee,
      fxRate: result.fxRate,
    })
    
    // In dry-run mode, auto-settle after a delay
    if (process.env.DRY_RUN_MODE === 'true') {
      setTimeout(async () => {
        await prisma.payoutInstruction.update({
          where: { id: payoutInstructionId },
          data: {
            status: PayoutStatus.SETTLED,
            providerMessage: 'Auto-settled in dry-run mode',
          },
        })
        
        logger.info({
          msg: 'Payout auto-settled (dry-run)',
          payoutInstructionId,
        })
      }, 5000)
    }
  } catch (error) {
    logger.error({
      msg: 'Payout processing failed',
      payoutInstructionId,
      error: error instanceof Error ? error.message : error,
      retryAttempt,
    })
    
    // Update retry count
    await prisma.payoutInstruction.update({
      where: { id: payoutInstructionId },
      data: {
        retryCount: retryAttempt + 1,
        providerMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })
    
    // Re-throw to trigger BullMQ retry
    throw error
  }
}
