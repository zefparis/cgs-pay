import { DisbursementProvider, ProviderConfig } from './types'
import { generateHmacSignature, verifyHmacSignature } from '../lib/crypto'
import { logger } from '../lib/logger'
import { z } from 'zod'

const ThunesWebhookSchema = z.object({
  transaction_id: z.string(),
  status: z.enum(['completed', 'failed', 'cancelled']),
  message: z.string().optional(),
  amount: z.number(),
  currency: z.string(),
})

export class ThunesProvider implements DisbursementProvider {
  name: 'THUNES' = 'THUNES'
  private config: ProviderConfig
  
  constructor(config: ProviderConfig) {
    this.config = config
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
    const { idempotencyKey, amount, currency, beneficiary } = input
    
    // Prepare request payload
    const payload = {
      idempotency_key: idempotencyKey,
      amount,
      currency,
      beneficiary_name: beneficiary.name,
      beneficiary_account: beneficiary.phoneOrIban,
      beneficiary_type: beneficiary.walletType,
      beneficiary_country: beneficiary.country || 'CD',
      purpose: 'Investment Payout',
    }
    
    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`
    const signature = generateHmacSignature(signaturePayload, this.config.apiSecret)
    
    try {
      const response = await fetch(`${this.config.baseUrl}/v1/payouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-Timestamp': timestamp,
          'X-Signature': signature,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const error = await response.text()
        logger.error({ 
          msg: 'Thunes payout submission failed',
          status: response.status,
          error,
        })
        throw new Error(`Thunes API error: ${response.status}`)
      }
      
      const result = await response.json() as any
      
      return {
        externalId: result.transaction_id || result.id,
        fee: result.fee || amount * 0.012, // 1.2% default
        fxRate: result.fx_rate || 1,
      }
    } catch (error) {
      // In sandbox/dry-run mode, return mock response
      if (this.config.baseUrl.includes('sandbox') || !this.config.apiKey) {
        logger.warn('Thunes: Running in sandbox mode, returning mock response')
        return {
          externalId: `THUNES-${Date.now()}-${idempotencyKey.substring(0, 8)}`,
          fee: amount * 0.012,
          fxRate: 1,
        }
      }
      throw error
    }
  }
  
  verifySignature(headers: Record<string, string>, rawBody: Buffer): boolean {
    const signature = headers['x-thunes-signature'] || headers['X-Thunes-Signature']
    const timestamp = headers['x-thunes-timestamp'] || headers['X-Thunes-Timestamp']
    
    if (!signature || !timestamp) {
      logger.error('Thunes webhook missing signature or timestamp')
      return false
    }
    
    const payload = `${timestamp}.${rawBody.toString()}`
    return verifyHmacSignature(payload, signature, this.config.apiSecret)
  }
  
  parseWebhook(body: unknown): {
    externalId: string
    status: 'SETTLED' | 'FAILED'
    providerMessage?: string
  } {
    const parsed = ThunesWebhookSchema.parse(body)
    
    let status: 'SETTLED' | 'FAILED'
    switch (parsed.status) {
      case 'completed':
        status = 'SETTLED'
        break
      case 'failed':
      case 'cancelled':
        status = 'FAILED'
        break
      default:
        status = 'FAILED'
    }
    
    return {
      externalId: parsed.transaction_id,
      status,
      providerMessage: parsed.message,
    }
  }
}
