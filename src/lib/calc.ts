import Decimal from 'decimal.js'
import { InvestorAgreement, SimSnapshot } from '@prisma/client'

export interface FinancialSnapshot {
  stake: Decimal
  ggr: Decimal
  ngr: Decimal
  feesPct: Decimal
  bonusesPct: Decimal
  taxesPct: Decimal
  mktPct: Decimal
  payoutFeesPct: Decimal
  fxPct: Decimal
  marketMultiplier: number
  fixedOpex?: Decimal
  capexAmort?: Decimal
}

export interface SettlementCalculation {
  totals: {
    stake: Decimal
    ggr: Decimal
    ngr: Decimal
    taxes: Decimal
    marketing: Decimal
    ngrNet: Decimal
    totalInvestorPayout: Decimal
    companyTake: Decimal
    payoutFees: Decimal
    fxFees: Decimal
  }
  investors: Array<{
    investorId: string
    agreement: InvestorAgreement
    grossAmount: Decimal
    payoutFee: Decimal
    fxFee: Decimal
    netAmount: Decimal
    eligible: boolean
    reason?: string
  }>
}

/**
 * Compute settlement from snapshot and investor agreements
 */
export function computeSettlement(
  snapshot: SimSnapshot | FinancialSnapshot,
  agreements: InvestorAgreement[],
  payoutPct: number = 70
): SettlementCalculation {
  const stake = new Decimal(snapshot.stake)
  const marketMultiplier = new Decimal(snapshot.marketMultiplier || 1)
  
  // Apply market multiplier to stake
  const adjustedStake = stake.mul(marketMultiplier)
  
  // Calculate GGR
  const ggr = adjustedStake.mul(new Decimal(1).minus(new Decimal(payoutPct).div(100)))
  
  // Calculate NGR
  const bonuses = ggr.mul(new Decimal(snapshot.bonusesPct).div(100))
  const fees = ggr.mul(new Decimal(snapshot.feesPct).div(100))
  const ngr = ggr.minus(bonuses).minus(fees)
  
  // Calculate deductions
  const taxes = ngr.mul(new Decimal(snapshot.taxesPct).div(100))
  const marketing = ngr.mul(new Decimal(snapshot.mktPct).div(100))
  
  // Calculate NGR Net
  const fixedOpex = 'fixedOpex' in snapshot ? new Decimal(snapshot.fixedOpex || 0) : new Decimal(0)
  const ngrNet = ngr.minus(taxes).minus(marketing).minus(fixedOpex)
  
  // Calculate total investor share
  let totalInvestorPayout = new Decimal(0)
  const investorCalculations: SettlementCalculation['investors'] = []
  
  // Calculate per investor
  for (const agreement of agreements) {
    if (!agreement.active) {
      investorCalculations.push({
        investorId: agreement.investorId,
        agreement,
        grossAmount: new Decimal(0),
        payoutFee: new Decimal(0),
        fxFee: new Decimal(0),
        netAmount: new Decimal(0),
        eligible: false,
        reason: 'Agreement inactive',
      })
      continue
    }
    
    // Determine base for calculation
    const base = agreement.basis === 'NGR' ? ngr : ngrNet
    const sharePercent = new Decimal(agreement.sharePercent).div(100)
    const grossAmount = base.mul(sharePercent)
    
    // Apply payout fees
    const payoutFee = grossAmount.mul(new Decimal(snapshot.payoutFeesPct).div(100))
    
    // Apply FX fees if applicable
    const fxFee = grossAmount.mul(new Decimal(snapshot.fxPct).div(100))
    
    // Calculate net amount
    const netAmount = grossAmount.minus(payoutFee).minus(fxFee)
    
    // Check threshold
    const threshold = new Decimal(agreement.minPayoutThreshold)
    const eligible = netAmount.gte(threshold)
    
    investorCalculations.push({
      investorId: agreement.investorId,
      agreement,
      grossAmount,
      payoutFee,
      fxFee,
      netAmount,
      eligible,
      reason: eligible ? undefined : `Below threshold (${threshold.toString()})`
    })
    
    if (eligible) {
      totalInvestorPayout = totalInvestorPayout.add(netAmount)
    }
  }
  
  // Calculate company take
  const capexAmort = 'capexAmort' in snapshot ? new Decimal(snapshot.capexAmort || 0) : new Decimal(0)
  const totalPayoutFees = investorCalculations
    .filter(i => i.eligible)
    .reduce((sum, i) => sum.add(i.payoutFee), new Decimal(0))
  const totalFxFees = investorCalculations
    .filter(i => i.eligible)
    .reduce((sum, i) => sum.add(i.fxFee), new Decimal(0))
  
  const companyTake = ngrNet
    .minus(totalInvestorPayout)
    .minus(capexAmort)
    .minus(totalPayoutFees)
    .minus(totalFxFees)
  
  return {
    totals: {
      stake: adjustedStake,
      ggr,
      ngr,
      taxes,
      marketing,
      ngrNet,
      totalInvestorPayout,
      companyTake,
      payoutFees: totalPayoutFees,
      fxFees: totalFxFees,
    },
    investors: investorCalculations,
  }
}

/**
 * Check if payout should be executed based on frequency
 */
export function shouldExecutePayout(
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  lastPayoutDate: Date | null,
  currentDate: Date = new Date()
): boolean {
  if (!lastPayoutDate) return true
  
  const daysSinceLastPayout = Math.floor(
    (currentDate.getTime() - lastPayoutDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  
  switch (frequency) {
    case 'DAILY':
      return daysSinceLastPayout >= 1
    case 'WEEKLY':
      return daysSinceLastPayout >= 7
    case 'MONTHLY':
      return daysSinceLastPayout >= 30
    default:
      return false
  }
}

/**
 * Format amount for display
 */
export function formatAmount(amount: Decimal, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount.toNumber())
}
