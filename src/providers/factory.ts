import { DisbursementProvider, ProviderConfig } from './types'
import { ThunesProvider } from './thunes'
import { RapydProvider } from './rapyd'
import { DryRunProvider } from './dryrun'
import { logger } from '../lib/logger'

export function createProvider(name?: string): DisbursementProvider {
  const providerName = name || process.env.PROVIDER || 'THUNES'
  const isDryRun = process.env.DRY_RUN_MODE === 'true' || process.env.NODE_ENV === 'test'
  
  if (isDryRun) {
    logger.info(`Creating DryRun provider (simulating ${providerName})`)
    return new DryRunProvider(providerName as 'THUNES' | 'RAPYD')
  }
  
  const config: ProviderConfig = {
    baseUrl: '',
    apiKey: '',
    apiSecret: '',
    walletCurrency: 'EUR',
  }
  
  switch (providerName) {
    case 'THUNES':
      config.baseUrl = process.env.THUNES_BASE_URL || ''
      config.apiKey = process.env.THUNES_KEY || ''
      config.apiSecret = process.env.THUNES_SECRET || ''
      
      if (!config.apiKey || !config.apiSecret) {
        logger.warn('Thunes credentials missing, falling back to dry-run mode')
        return new DryRunProvider('THUNES')
      }
      
      logger.info('Creating Thunes provider')
      return new ThunesProvider(config)
      
    case 'RAPYD':
      config.baseUrl = process.env.RAPYD_BASE_URL || ''
      config.apiKey = process.env.RAPYD_KEY || ''
      config.apiSecret = process.env.RAPYD_SECRET || ''
      
      if (!config.apiKey || !config.apiSecret) {
        logger.warn('Rapyd credentials missing, falling back to dry-run mode')
        return new DryRunProvider('RAPYD')
      }
      
      logger.info('Creating Rapyd provider')
      return new RapydProvider(config)
      
    default:
      logger.warn(`Unknown provider: ${providerName}, using dry-run mode`)
      return new DryRunProvider('THUNES')
  }
}
