import { describe, it, expect, beforeEach } from 'vitest'
import { ThunesProvider } from '../src/providers/thunes'
import { RapydProvider } from '../src/providers/rapyd'
import { DryRunProvider } from '../src/providers/dryrun'
import { generateHmacSignature } from '../src/lib/crypto'

describe('Payment Providers', () => {
  describe('ThunesProvider', () => {
    let provider: ThunesProvider
    
    beforeEach(() => {
      provider = new ThunesProvider({
        baseUrl: 'https://sandbox.thunes.com/api',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        walletCurrency: 'EUR',
      })
    })
    
    it('should verify valid signature', () => {
      const body = Buffer.from('{"test": "data"}')
      const timestamp = '1234567890'
      const payload = `${timestamp}.${body.toString()}`
      const signature = generateHmacSignature(payload, 'test-secret')
      
      const headers = {
        'x-thunes-signature': signature,
        'x-thunes-timestamp': timestamp,
      }
      
      expect(provider.verifySignature(headers, body)).toBe(true)
    })
    
    it('should reject invalid signature', () => {
      const body = Buffer.from('{"test": "data"}')
      const headers = {
        'x-thunes-signature': 'invalid-signature',
        'x-thunes-timestamp': '1234567890',
      }
      
      expect(provider.verifySignature(headers, body)).toBe(false)
    })
    
    it('should parse webhook correctly', () => {
      const webhook = {
        transaction_id: 'THUNES-123',
        status: 'completed',
        amount: 100,
        currency: 'EUR',
      }
      
      const result = provider.parseWebhook(webhook)
      
      expect(result.externalId).toBe('THUNES-123')
      expect(result.status).toBe('SETTLED')
    })
    
    it('should handle failed webhook', () => {
      const webhook = {
        transaction_id: 'THUNES-456',
        status: 'failed',
        message: 'Insufficient funds',
        amount: 100,
        currency: 'EUR',
      }
      
      const result = provider.parseWebhook(webhook)
      
      expect(result.externalId).toBe('THUNES-456')
      expect(result.status).toBe('FAILED')
      expect(result.providerMessage).toBe('Insufficient funds')
    })
  })
  
  describe('RapydProvider', () => {
    let provider: RapydProvider
    
    beforeEach(() => {
      provider = new RapydProvider({
        baseUrl: 'https://sandboxapi.rapyd.net',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        walletCurrency: 'EUR',
      })
    })
    
    it('should parse webhook correctly', () => {
      const webhook = {
        id: 'webhook-123',
        type: 'payout.completed',
        data: {
          id: 'RAPYD-789',
          status: 'CLO',
          amount: 200,
          currency: 'EUR',
        },
      }
      
      const result = provider.parseWebhook(webhook)
      
      expect(result.externalId).toBe('RAPYD-789')
      expect(result.status).toBe('SETTLED')
    })
    
    it('should handle error status', () => {
      const webhook = {
        id: 'webhook-456',
        type: 'payout.failed',
        data: {
          id: 'RAPYD-999',
          status: 'ERR',
          amount: 200,
          currency: 'EUR',
          failure_reason: 'Invalid beneficiary',
        },
      }
      
      const result = provider.parseWebhook(webhook)
      
      expect(result.externalId).toBe('RAPYD-999')
      expect(result.status).toBe('FAILED')
      expect(result.providerMessage).toBe('Invalid beneficiary')
    })
  })
  
  describe('DryRunProvider', () => {
    let provider: DryRunProvider
    
    beforeEach(() => {
      provider = new DryRunProvider('THUNES', true, 100)
    })
    
    it('should generate mock external ID', async () => {
      const result = await provider.submitPayout({
        idempotencyKey: 'test-key-123',
        amount: 100,
        currency: 'EUR',
        beneficiary: {
          name: 'Test User',
          phoneOrIban: '+243123456789',
          walletType: 'MOBILE_MONEY',
        },
      })
      
      expect(result.externalId).toContain('THUNES-DRY')
      expect(result.fee).toBe(1.2) // 1.2% of 100
      expect(result.fxRate).toBe(1)
    })
    
    it('should always verify signature as true', () => {
      expect(provider.verifySignature({}, Buffer.from('any'))).toBe(true)
    })
    
    it('should parse any webhook format', () => {
      const result = provider.parseWebhook({
        externalId: 'TEST-123',
        status: 'SETTLED',
      })
      
      expect(result.externalId).toBe('TEST-123')
      expect(result.status).toBe('SETTLED')
    })
  })
})
