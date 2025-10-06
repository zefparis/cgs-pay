export interface DisbursementProvider {
  name: 'THUNES' | 'RAPYD'
  
  submitPayout(input: {
    idempotencyKey: string
    amount: number
    currency: string
    beneficiary: {
      name: string
      phoneOrIban: string
      walletType: 'MOBILE_MONEY' | 'BANK'
      country?: string
    }
  }): Promise<{
    externalId: string
    fee: number
    fxRate?: number
  }>
  
  verifySignature(headers: Record<string, string>, rawBody: Buffer): boolean
  
  parseWebhook(body: unknown): {
    externalId: string
    status: 'SETTLED' | 'FAILED'
    providerMessage?: string
  }
}

export interface ProviderConfig {
  baseUrl: string
  apiKey: string
  apiSecret: string
  walletCurrency: string
}
