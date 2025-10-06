import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Decimal } from 'decimal.js'
import { PrismaClient, LedgerAccount } from '@prisma/client'
import { postDoubleEntry, getLedgerBalance, verifyLedgerBalance } from '../src/lib/ledger'

// Mock Prisma client
const mockPrisma = {
  ledgerEntry: {
    createMany: vi.fn(),
    findMany: vi.fn(),
  },
} as unknown as PrismaClient

describe('Ledger System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('postDoubleEntry', () => {
    it('should create balanced debit and credit entries', async () => {
      const input = {
        debitAccount: LedgerAccount.COMPANY,
        creditAccount: LedgerAccount.INVESTOR,
        amount: new Decimal(1000),
        currency: 'EUR',
        runId: 'run-123',
        ref: 'Test transaction',
      }
      
      await postDoubleEntry(mockPrisma, input)
      
      expect(mockPrisma.ledgerEntry.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            account: LedgerAccount.COMPANY,
            amount: new Decimal(1000),
            side: 'DEBIT',
            ref: 'Test transaction',
          }),
          expect.objectContaining({
            account: LedgerAccount.INVESTOR,
            amount: new Decimal(1000),
            side: 'CREDIT',
            ref: 'Test transaction',
          }),
        ]),
      })
    })
    
    it('should reject negative amounts', async () => {
      const input = {
        debitAccount: LedgerAccount.COMPANY,
        creditAccount: LedgerAccount.INVESTOR,
        amount: new Decimal(-100),
        currency: 'EUR',
        runId: 'run-123',
        ref: 'Invalid transaction',
      }
      
      await expect(postDoubleEntry(mockPrisma, input)).rejects.toThrow(
        'Amount must be positive'
      )
    })
    
    it('should include investor ID when provided', async () => {
      const input = {
        debitAccount: LedgerAccount.COMPANY,
        creditAccount: LedgerAccount.INVESTOR,
        amount: new Decimal(500),
        currency: 'EUR',
        investorId: 'investor-123',
        runId: 'run-123',
        ref: 'Investor payout',
      }
      
      await postDoubleEntry(mockPrisma, input)
      
      expect(mockPrisma.ledgerEntry.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            investorId: 'investor-123',
          }),
        ]),
      })
    })
  })
  
  describe('getLedgerBalance', () => {
    it('should calculate balance correctly', async () => {
      mockPrisma.ledgerEntry.findMany = vi.fn().mockResolvedValue([
        { amount: new Decimal(1000), side: 'CREDIT' },
        { amount: new Decimal(300), side: 'DEBIT' },
        { amount: new Decimal(500), side: 'CREDIT' },
        { amount: new Decimal(100), side: 'DEBIT' },
      ])
      
      const balance = await getLedgerBalance(mockPrisma, LedgerAccount.COMPANY)
      
      // Credits: 1000 + 500 = 1500
      // Debits: 300 + 100 = 400
      // Balance: 1500 - 400 = 1100
      expect(balance.toNumber()).toBe(1100)
    })
    
    it('should filter by investor ID when provided', async () => {
      await getLedgerBalance(mockPrisma, LedgerAccount.INVESTOR, 'investor-123')
      
      expect(mockPrisma.ledgerEntry.findMany).toHaveBeenCalledWith({
        where: {
          account: LedgerAccount.INVESTOR,
          investorId: 'investor-123',
        },
      })
    })
  })
  
  describe('verifyLedgerBalance', () => {
    it('should return true when ledger is balanced', async () => {
      mockPrisma.ledgerEntry.findMany = vi.fn().mockResolvedValue([
        { amount: new Decimal(1000), side: 'DEBIT' },
        { amount: new Decimal(1000), side: 'CREDIT' },
        { amount: new Decimal(500), side: 'DEBIT' },
        { amount: new Decimal(500), side: 'CREDIT' },
      ])
      
      const isBalanced = await verifyLedgerBalance(mockPrisma)
      expect(isBalanced).toBe(true)
    })
    
    it('should return false when ledger is imbalanced', async () => {
      mockPrisma.ledgerEntry.findMany = vi.fn().mockResolvedValue([
        { amount: new Decimal(1000), side: 'DEBIT' },
        { amount: new Decimal(900), side: 'CREDIT' },
      ])
      
      const isBalanced = await verifyLedgerBalance(mockPrisma)
      expect(isBalanced).toBe(false)
    })
    
    it('should filter by runId when provided', async () => {
      await verifyLedgerBalance(mockPrisma, 'run-123')
      
      expect(mockPrisma.ledgerEntry.findMany).toHaveBeenCalledWith({
        where: { runId: 'run-123' },
      })
    })
  })
})
