import { Decimal } from 'decimal.js'
import { LedgerAccount, LedgerSide, PrismaClient } from '@prisma/client'
import { generateId } from './crypto'
import { logger } from './logger'

export interface LedgerEntryInput {
  account: LedgerAccount
  amount: Decimal
  currency?: string
  investorId?: string
  runId: string
  ref: string
}

export interface DoubleEntryInput {
  debitAccount: LedgerAccount
  creditAccount: LedgerAccount
  amount: Decimal
  currency?: string
  investorId?: string
  runId: string
  ref: string
}

/**
 * Post a double-entry transaction to maintain balanced books
 */
export async function postDoubleEntry(
  prisma: PrismaClient,
  input: DoubleEntryInput
): Promise<void> {
  const { debitAccount, creditAccount, amount, currency = 'EUR', investorId, runId, ref } = input
  
  if (amount.lte(0)) {
    throw new Error('Amount must be positive for ledger entries')
  }
  
  const entries = [
    {
      id: generateId(),
      account: debitAccount,
      amount: amount,
      currency,
      investorId,
      runId,
      ref,
      side: LedgerSide.DEBIT,
      ts: new Date(),
    },
    {
      id: generateId(),
      account: creditAccount,
      amount: amount,
      currency,
      investorId,
      runId,
      ref,
      side: LedgerSide.CREDIT,
      ts: new Date(),
    },
  ]
  
  await prisma.ledgerEntry.createMany({
    data: entries,
  })
  
  logger.info({
    msg: 'Double entry posted',
    debitAccount,
    creditAccount,
    amount: amount.toString(),
    ref,
  })
}

/**
 * Post multiple ledger entries for a settlement
 */
export async function postSettlementLedgers(
  prisma: PrismaClient,
  runId: string,
  totals: {
    ngr: Decimal
    taxes: Decimal
    marketing: Decimal
    totalInvestorPayout: Decimal
    companyTake: Decimal
    payoutFees: Decimal
    fxFees: Decimal
  }
): Promise<void> {
  const entries: DoubleEntryInput[] = []
  
  // NGR to Company
  if (totals.ngr.gt(0)) {
    entries.push({
      debitAccount: LedgerAccount.NGR,
      creditAccount: LedgerAccount.COMPANY,
      amount: totals.ngr,
      runId,
      ref: 'NGR Revenue',
    })
  }
  
  // Taxes reserve
  if (totals.taxes.gt(0)) {
    entries.push({
      debitAccount: LedgerAccount.COMPANY,
      creditAccount: LedgerAccount.TAX,
      amount: totals.taxes,
      runId,
      ref: 'Tax Reserve',
    })
  }
  
  // Marketing reserve
  if (totals.marketing.gt(0)) {
    entries.push({
      debitAccount: LedgerAccount.COMPANY,
      creditAccount: LedgerAccount.MKT,
      amount: totals.marketing,
      runId,
      ref: 'Marketing Reserve',
    })
  }
  
  // Payout fees
  if (totals.payoutFees.gt(0)) {
    entries.push({
      debitAccount: LedgerAccount.COMPANY,
      creditAccount: LedgerAccount.FEES,
      amount: totals.payoutFees,
      runId,
      ref: 'Payout Provider Fees',
    })
  }
  
  // FX fees
  if (totals.fxFees.gt(0)) {
    entries.push({
      debitAccount: LedgerAccount.COMPANY,
      creditAccount: LedgerAccount.FEES,
      amount: totals.fxFees,
      runId,
      ref: 'FX Conversion Fees',
    })
  }
  
  // Post all entries
  for (const entry of entries) {
    await postDoubleEntry(prisma, entry)
  }
}

/**
 * Post investor payout ledger entry
 */
export async function postInvestorPayoutLedger(
  prisma: PrismaClient,
  runId: string,
  investorId: string,
  amount: Decimal
): Promise<void> {
  await postDoubleEntry(prisma, {
    debitAccount: LedgerAccount.COMPANY,
    creditAccount: LedgerAccount.INVESTOR,
    amount,
    investorId,
    runId,
    ref: `Investor Payout - ${investorId}`,
  })
}

/**
 * Get ledger balance for an account
 */
export async function getLedgerBalance(
  prisma: PrismaClient,
  account: LedgerAccount,
  investorId?: string
): Promise<Decimal> {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      account,
      ...(investorId && { investorId }),
    },
  })
  
  let balance = new Decimal(0)
  
  for (const entry of entries) {
    const amount = new Decimal(entry.amount)
    if (entry.side === LedgerSide.DEBIT) {
      balance = balance.minus(amount)
    } else {
      balance = balance.add(amount)
    }
  }
  
  return balance
}

/**
 * Verify ledger is balanced (sum of debits equals sum of credits)
 */
export async function verifyLedgerBalance(
  prisma: PrismaClient,
  runId?: string
): Promise<boolean> {
  const where = runId ? { runId } : {}
  const entries = await prisma.ledgerEntry.findMany({ where })
  
  let totalDebits = new Decimal(0)
  let totalCredits = new Decimal(0)
  
  for (const entry of entries) {
    const amount = new Decimal(entry.amount)
    if (entry.side === LedgerSide.DEBIT) {
      totalDebits = totalDebits.add(amount)
    } else {
      totalCredits = totalCredits.add(amount)
    }
  }
  
  const isBalanced = totalDebits.equals(totalCredits)
  
  if (!isBalanced) {
    logger.error({
      msg: 'Ledger imbalance detected',
      totalDebits: totalDebits.toString(),
      totalCredits: totalCredits.toString(),
      difference: totalDebits.minus(totalCredits).toString(),
      runId,
    })
  }
  
  return isBalanced
}
