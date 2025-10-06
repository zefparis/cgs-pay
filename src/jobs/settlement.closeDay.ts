import { Decimal } from 'decimal.js'
import { prisma } from '../db/prisma'
import { computeSettlement, shouldExecutePayout } from '../lib/calc'
import { postSettlementLedgers, postInvestorPayoutLedger } from '../lib/ledger'
import { generateIdempotencyKey } from '../lib/crypto'
import { payoutQueue } from './queue'
import { logger } from '../lib/logger'
import { SettlementStatus, PayoutStatus } from '@prisma/client'

export interface SettlementJobData {
  periodStart: Date
  periodEnd: Date
  dryRun?: boolean
}

export async function processSettlementJob(data: SettlementJobData): Promise<void> {
  const { periodStart, periodEnd, dryRun = false } = data
  
  logger.info({
    msg: 'Starting settlement processing',
    periodStart,
    periodEnd,
    dryRun,
  })
  
  try {
    // Check if settlement already exists for this period
    const existingRun = await prisma.settlementRun.findFirst({
      where: {
        periodStart,
        periodEnd,
        status: {
          in: [SettlementStatus.FINALIZED, SettlementStatus.PAID],
        },
      },
    })
    
    if (existingRun) {
      logger.warn({
        msg: 'Settlement already exists for period',
        runId: existingRun.id,
        status: existingRun.status,
      })
      return
    }
    
    // Get or create SimSnapshot for the period
    let snapshot = await prisma.simSnapshot.findFirst({
      where: {
        periodStart,
        periodEnd,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    if (!snapshot) {
      // Create default snapshot with environment values
      snapshot = await prisma.simSnapshot.create({
        data: {
          periodStart,
          periodEnd,
          stake: new Decimal(1000000), // Default 1M stake
          ggr: new Decimal(300000),    // Default 30% of stake
          ngr: new Decimal(270000),    // After fees/bonuses
          feesPct: new Decimal(process.env.DEFAULT_FEES_PCT || 5),
          bonusesPct: new Decimal(process.env.DEFAULT_BONUSES_PCT || 10),
          taxesPct: new Decimal(process.env.DEFAULT_TAXES_PCT || 20),
          mktPct: new Decimal(process.env.DEFAULT_MARKETING_PCT || 20),
          payoutFeesPct: new Decimal(process.env.DEFAULT_PAYOUT_FEES_PCT || 1.2),
          fxPct: new Decimal(process.env.DEFAULT_FX_PCT || 0),
          marketMultiplier: parseInt(process.env.DEFAULT_MARKET_MULTIPLIER || '30'),
        },
      })
    }
    
    // Get active investor agreements
    const agreements = await prisma.investorAgreement.findMany({
      where: { active: true },
      include: { investor: true },
    })
    
    if (agreements.length === 0) {
      logger.warn('No active investor agreements found')
      return
    }
    
    // Compute settlement
    const settlement = computeSettlement(snapshot, agreements)
    
    // Create settlement run
    const run = await prisma.settlementRun.create({
      data: {
        periodStart,
        periodEnd,
        status: dryRun ? SettlementStatus.DRAFT : SettlementStatus.FINALIZED,
        totalsJson: JSON.stringify({
          stake: settlement.totals.stake.toString(),
          ggr: settlement.totals.ggr.toString(),
          ngr: settlement.totals.ngr.toString(),
          taxes: settlement.totals.taxes.toString(),
          marketing: settlement.totals.marketing.toString(),
          ngrNet: settlement.totals.ngrNet.toString(),
          totalInvestorPayout: settlement.totals.totalInvestorPayout.toString(),
          companyTake: settlement.totals.companyTake.toString(),
          payoutFees: settlement.totals.payoutFees.toString(),
          fxFees: settlement.totals.fxFees.toString(),
        }),
        snapshot: {
          connect: { id: snapshot.id }
        },
      },
    })
    
    logger.info({
      msg: 'Settlement run created',
      runId: run.id,
      totals: settlement.totals,
    })
    
    // Post ledger entries (if not dry run)
    if (!dryRun) {
      await postSettlementLedgers(prisma, run.id, settlement.totals)
    }
    
    // Process eligible investor payouts
    for (const investor of settlement.investors) {
      if (!investor.eligible) {
        logger.info({
          msg: 'Investor not eligible for payout',
          investorId: investor.investorId,
          reason: investor.reason,
        })
        continue
      }
      
      // Check KYC status
      const investorRecord = await prisma.investor.findUnique({
        where: { id: investor.investorId },
      })
      
      if (!investorRecord || investorRecord.kycStatus !== 'VERIFIED') {
        logger.warn({
          msg: 'Investor KYC not verified',
          investorId: investor.investorId,
          kycStatus: investorRecord?.kycStatus,
        })
        continue
      }
      
      // Check payout frequency
      const lastPayout = await prisma.payoutInstruction.findFirst({
        where: {
          investorId: investor.investorId,
          status: PayoutStatus.SETTLED,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
      
      if (!shouldExecutePayout(
        investor.agreement.payoutFrequency,
        lastPayout?.createdAt || null,
        periodEnd
      )) {
        logger.info({
          msg: 'Payout frequency not met',
          investorId: investor.investorId,
          frequency: investor.agreement.payoutFrequency,
          lastPayout: lastPayout?.createdAt,
        })
        continue
      }
      
      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(
        run.id,
        investor.investorId,
        investor.netAmount.toString(),
        'EUR'
      )
      
      // Create payout instruction
      const payoutInstruction = await prisma.payoutInstruction.create({
        data: {
          investorId: investor.investorId,
          runId: run.id,
          provider: process.env.PROVIDER as any || 'THUNES',
          amount: investor.netAmount,
          currency: 'EUR',
          fee: investor.payoutFee,
          fxRate: new Decimal(1),
          status: PayoutStatus.PENDING,
          idempotencyKey,
        },
      })
      
      // Post investor payout ledger
      if (!dryRun) {
        await postInvestorPayoutLedger(
          prisma,
          run.id,
          investor.investorId,
          investor.netAmount
        )
      }
      
      // Enqueue payout job
      if (!dryRun) {
        await payoutQueue.add('submit', {
          payoutInstructionId: payoutInstruction.id,
        })
        
        logger.info({
          msg: 'Payout job enqueued',
          payoutInstructionId: payoutInstruction.id,
          investorId: investor.investorId,
          amount: investor.netAmount.toString(),
        })
      }
    }
    
    // Update run status if all payouts processed
    if (!dryRun) {
      await prisma.settlementRun.update({
        where: { id: run.id },
        data: { status: SettlementStatus.PAID },
      })
    }
    
    logger.info({
      msg: 'Settlement processing completed',
      runId: run.id,
      investorCount: settlement.investors.filter(i => i.eligible).length,
    })
  } catch (error) {
    logger.error({
      msg: 'Settlement processing failed',
      error: error instanceof Error ? error.message : error,
    })
    throw error
  }
}
