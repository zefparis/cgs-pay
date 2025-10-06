import { describe, it, expect } from 'vitest'
import { Decimal } from 'decimal.js'
import { computeSettlement, shouldExecutePayout, formatAmount } from '../src/lib/calc'
import { InvestorAgreement } from '@prisma/client'

describe('Financial Calculations', () => {
  const mockSnapshot = {
    id: 'test-snapshot',
    periodStart: new Date('2024-01-01'),
    periodEnd: new Date('2024-01-02'),
    stake: new Decimal(1000000),
    ggr: new Decimal(300000),
    ngr: new Decimal(270000),
    feesPct: new Decimal(5),
    bonusesPct: new Decimal(10),
    taxesPct: new Decimal(20),
    mktPct: new Decimal(20),
    payoutFeesPct: new Decimal(1.2),
    fxPct: new Decimal(0),
    marketingOn: true,
    marketMultiplier: 30,
    runId: null,
    createdAt: new Date(),
  }
  
  const mockAgreement: InvestorAgreement = {
    id: 'agreement-1',
    investorId: 'investor-1',
    sharePercent: new Decimal(25),
    basis: 'NGR_NET',
    minPayoutThreshold: new Decimal(100),
    payoutFrequency: 'DAILY',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  
  describe('computeSettlement', () => {
    it('should calculate settlement with market multiplier', () => {
      const result = computeSettlement(mockSnapshot, [mockAgreement])
      
      // Stake should be multiplied by 30
      expect(result.totals.stake.toNumber()).toBe(30000000) // 1M * 30
      
      // GGR should be 30% of adjusted stake (70% payout)
      expect(result.totals.ggr.toNumber()).toBe(9000000) // 30M * 0.30
      
      // NGR should be GGR minus bonuses and fees
      // NGR = 9M - (10% * 9M) - (5% * 9M) = 9M - 900k - 450k = 7.65M
      expect(result.totals.ngr.toNumber()).toBe(7650000)
      
      // Taxes should be 20% of NGR
      expect(result.totals.taxes.toNumber()).toBe(1530000)
      
      // Marketing should be 20% of NGR
      expect(result.totals.marketing.toNumber()).toBe(1530000)
      
      // NGR Net = NGR - Taxes - Marketing = 7.65M - 1.53M - 1.53M = 4.59M
      expect(result.totals.ngrNet.toNumber()).toBe(4590000)
      
      // Investor payout (25% of NGR_NET) = 4.59M * 0.25 = 1.1475M
      // Minus payout fee (1.2%) = 1.1475M * 0.012 = 13,770
      // Net investor payout = 1.1475M - 13,770 = 1,133,730
      expect(result.investors[0].eligible).toBe(true)
      expect(result.investors[0].grossAmount.toNumber()).toBe(1147500)
      expect(result.investors[0].netAmount.toNumber()).toBe(1133730)
    })
    
    it('should respect minimum payout threshold', () => {
      const lowAgreement = {
        ...mockAgreement,
        sharePercent: new Decimal(0.001), // Very small share
      }
      
      const result = computeSettlement(mockSnapshot, [lowAgreement])
      
      expect(result.investors[0].eligible).toBe(false)
      expect(result.investors[0].reason).toContain('Below threshold')
    })
    
    it('should calculate based on NGR when basis is NGR', () => {
      const ngrAgreement = {
        ...mockAgreement,
        basis: 'NGR' as const,
      }
      
      const result = computeSettlement(mockSnapshot, [ngrAgreement])
      
      // Should be 25% of NGR (7.65M) = 1.9125M
      const expectedGross = 7650000 * 0.25
      expect(result.investors[0].grossAmount.toNumber()).toBe(expectedGross)
    })
    
    it('should handle multiple investors proportionally', () => {
      const agreements = [
        { ...mockAgreement, id: 'inv1', investorId: 'inv1', sharePercent: new Decimal(15) },
        { ...mockAgreement, id: 'inv2', investorId: 'inv2', sharePercent: new Decimal(10) },
      ]
      
      const result = computeSettlement(mockSnapshot, agreements)
      
      // Total share is 25%, should be split 15% and 10%
      expect(result.investors[0].grossAmount.toNumber()).toBe(688500) // 15% of 4.59M
      expect(result.investors[1].grossAmount.toNumber()).toBe(459000) // 10% of 4.59M
    })
  })
  
  describe('shouldExecutePayout', () => {
    const now = new Date('2024-01-10T12:00:00Z')
    
    it('should return true when no previous payout exists', () => {
      expect(shouldExecutePayout('DAILY', null, now)).toBe(true)
      expect(shouldExecutePayout('WEEKLY', null, now)).toBe(true)
      expect(shouldExecutePayout('MONTHLY', null, now)).toBe(true)
    })
    
    it('should respect daily frequency', () => {
      const yesterday = new Date('2024-01-09T12:00:00Z')
      const today = new Date('2024-01-10T11:00:00Z')
      
      expect(shouldExecutePayout('DAILY', yesterday, now)).toBe(true)
      expect(shouldExecutePayout('DAILY', today, now)).toBe(false)
    })
    
    it('should respect weekly frequency', () => {
      const lastWeek = new Date('2024-01-03T12:00:00Z')
      const threeDaysAgo = new Date('2024-01-07T12:00:00Z')
      
      expect(shouldExecutePayout('WEEKLY', lastWeek, now)).toBe(true)
      expect(shouldExecutePayout('WEEKLY', threeDaysAgo, now)).toBe(false)
    })
    
    it('should respect monthly frequency', () => {
      const lastMonth = new Date('2023-12-10T12:00:00Z')
      const twoWeeksAgo = new Date('2023-12-27T12:00:00Z')
      
      expect(shouldExecutePayout('MONTHLY', lastMonth, now)).toBe(true)
      expect(shouldExecutePayout('MONTHLY', twoWeeksAgo, now)).toBe(false)
    })
  })
  
  describe('formatAmount', () => {
    it('should format EUR amounts correctly', () => {
      const amount = new Decimal(1234.56)
      expect(formatAmount(amount, 'EUR')).toMatch(/€|EUR/)
      expect(formatAmount(amount, 'EUR')).toContain('1,234.56')
    })
    
    it('should format USD amounts correctly', () => {
      const amount = new Decimal(9876.54)
      expect(formatAmount(amount, 'USD')).toMatch(/\$|USD/)
      expect(formatAmount(amount, 'USD')).toContain('9,876.54')
    })
  })
})
