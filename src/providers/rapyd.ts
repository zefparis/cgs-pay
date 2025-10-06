import { DisbursementProvider, ProviderConfig } from './types'
import { logger } from '../lib/logger'
import { z } from 'zod'
import crypto from 'crypto'

const RapydWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    id: z.string(),
    status: z.enum(['CLO', 'ERR', 'CAN']),
    amount: z.number(),
    currency: z.string(),
    failure_reason: z.string().optional(),
  }),
})

export class RapydProvider implements DisbursementProvider {
  name: 'RAPYD' = 'RAPYD'
  private config: ProviderConfig
  
  constructor(config: ProviderConfig) {
    this.config = config
  }
  
  private generateRapydSignature(
    method: string,
    urlPath: string,
    salt: string,
    timestamp: string,
    body: string = ''
  ): string {
    const toSign = method + urlPath + salt + timestamp + this.config.apiKey + this.config.apiSecret + body
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(toSign)
      .digest('base64')
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
      ewallet: beneficiary.walletType === 'MOBILE_MONEY' ? beneficiary.phoneOrIban : null,
      bank_account: beneficiary.walletType === 'BANK' ? beneficiary.phoneOrIban : null,
      amount,
      currency,
      beneficiary: {
        name: beneficiary.name,
        country: beneficiary.country || 'CD',
      },
      payout_method_type: beneficiary.walletType === 'MOBILE_MONEY' ? 'cd_mobile_money' : 'cd_bank_transfer',
      metadata: {
        idempotency_key: idempotencyKey,
      },
    }
    
    // Generate Rapyd signature
    const salt = crypto.randomBytes(12).toString('hex')
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const urlPath = '/v1/payouts'
    const signature = this.generateRapydSignature(
      'POST',
      urlPath,
      salt,
      timestamp,
      JSON.stringify(payload)
    )
    
    try {
      const response = await fetch(`${this.config.baseUrl}${urlPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_key': this.config.apiKey,
          'salt': salt,
          'timestamp': timestamp,
          'signature': signature,
        },
        body: JSON.stringify(payload),
      })
      
      if (!response.ok) {
        const error = await response.text()
        logger.error({ 
          msg: 'Rapyd payout submission failed',
          status: response.status,
          error,
        })
        throw new Error(`Rapyd API error: ${response.status}`)
      }
      
      const result = await response.json() as any
      
      return {
        externalId: result.data?.id || result.id,
        fee: result.data?.fee || amount * 0.015, // 1.5% default for Rapyd
        fxRate: result.data?.fx_rate || 1,
      }
    } catch (error) {
      // In sandbox/dry-run mode, return mock response
      if (this.config.baseUrl.includes('sandbox') || !this.config.apiKey) {
        logger.warn('Rapyd: Running in sandbox mode, returning mock response')
        return {
          externalId: `RAPYD-${Date.now()}-${idempotencyKey.substring(0, 8)}`,
          fee: amount * 0.015,
          fxRate: 1,
        }
      }
      throw error
    }
  }
  
  verifySignature(headers: Record<string, string>, rawBody: Buffer): boolean {
    const signature = headers['signature'] || headers['Signature']
    const salt = headers['salt'] || headers['Salt']
    const timestamp = headers['timestamp'] || headers['Timestamp']
    
    if (!signature || !salt || !timestamp) {
      logger.error('Rapyd webhook missing signature, salt, or timestamp')
      return false
    }
    
    const urlPath = '/webhooks'
    const expectedSignature = this.generateRapydSignature(
      'POST',
      urlPath,
      salt,
      timestamp,
      rawBody.toString()
    )
    
    return signature === expectedSignature
  }
  
  parseWebhook(body: unknown): {
    externalId: string
    status: 'SETTLED' | 'FAILED'
    providerMessage?: string
  } {
    const parsed = RapydWebhookSchema.parse(body)
    
    let status: 'SETTLED' | 'FAILED'
    switch (parsed.data.status) {
      case 'CLO': // Closed/Completed
        status = 'SETTLED'
        break
      case 'ERR': // Error
      case 'CAN': // Cancelled
        status = 'FAILED'
        break
      default:
        status = 'FAILED'
    }
    
    return {
      externalId: parsed.data.id,
      status,
      providerMessage: parsed.data.failure_reason,
    }
  }
}
