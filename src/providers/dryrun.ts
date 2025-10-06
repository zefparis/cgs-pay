import { DisbursementProvider } from './types'
import { logger } from '../lib/logger'

export class DryRunProvider implements DisbursementProvider {
  name: 'THUNES' | 'RAPYD' = 'THUNES'
  private autoSettle: boolean
  private settleDelay: number
  
  constructor(name: 'THUNES' | 'RAPYD' = 'THUNES', autoSettle = true, settleDelay = 1000) {
    this.name = name
    this.autoSettle = autoSettle
    this.settleDelay = settleDelay
  }
  
  async submitPayout(input: {
    idempotencyKey: string
    amount: number
    currency: string
    beneficiary: {
      name: string
      phoneOrIban: string
      walletType: 'MOBILE_MONEY' | 'BANK'
      country?: string
    }
  }): Promise<{ externalId: string; fee: number; fxRate?: number }> {
    const { idempotencyKey, amount } = input
    
    logger.info({
      msg: 'DryRun: Simulating payout submission',
      provider: this.name,
      amount,
      idempotencyKey,
    })
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Generate mock external ID
    const externalId = `${this.name}-DRY-${Date.now()}-${idempotencyKey.substring(0, 8)}`
    
    // Simulate auto-settlement after delay
    if (this.autoSettle) {
      setTimeout(() => {
        logger.info({
          msg: 'DryRun: Auto-settling payout',
          externalId,
          delay: this.settleDelay,
        })
      }, this.settleDelay)
    }
    
    return {
      externalId,
      fee: amount * 0.012, // 1.2% fee
      fxRate: 1,
    }
  }
  
  verifySignature(_headers: Record<string, string>, _rawBody: Buffer): boolean {
    // Always return true in dry-run mode
    return true
  }
  
  parseWebhook(body: unknown): {
    externalId: string
    status: 'SETTLED' | 'FAILED'
    providerMessage?: string
  } {
    // Simple parsing for dry-run
    const payload = body as any
    
    return {
      externalId: payload.externalId || payload.id || 'DRY-UNKNOWN',
      status: payload.status === 'FAILED' ? 'FAILED' : 'SETTLED',
      providerMessage: payload.message || 'Dry-run settlement',
    }
  }
}
