import { PrismaClient } from '@prisma/client'
import { Decimal } from 'decimal.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')
  
  // Create test investor
  const investor1 = await prisma.investor.upsert({
    where: { id: 'investor-001' },
    update: {},
    create: {
      id: 'investor-001',
      name: 'Jean Dupont',
      phoneOrIban: '+243812345678',
      walletType: 'MOBILE_MONEY',
      currency: 'EUR',
      kycStatus: 'VERIFIED',
    },
  })
  
  const investor2 = await prisma.investor.upsert({
    where: { id: 'investor-002' },
    update: {},
    create: {
      id: 'investor-002',
      name: 'Marie Martin',
      phoneOrIban: 'CD89370400440532013000',
      walletType: 'BANK',
      currency: 'EUR',
      kycStatus: 'VERIFIED',
    },
  })
  
  console.log('✅ Created investors:', { investor1, investor2 })
  
  // Create investor agreements
  const agreement1 = await prisma.investorAgreement.upsert({
    where: { id: 'agreement-001' },
    update: {},
    create: {
      id: 'agreement-001',
      investorId: investor1.id,
      sharePercent: new Decimal(15),
      basis: 'NGR_NET',
      minPayoutThreshold: new Decimal(100),
      payoutFrequency: 'DAILY',
      active: true,
    },
  })
  
  const agreement2 = await prisma.investorAgreement.upsert({
    where: { id: 'agreement-002' },
    update: {},
    create: {
      id: 'agreement-002',
      investorId: investor2.id,
      sharePercent: new Decimal(10),
      basis: 'NGR_NET',
      minPayoutThreshold: new Decimal(500),
      payoutFrequency: 'WEEKLY',
      active: true,
    },
  })
  
  console.log('✅ Created agreements:', { agreement1, agreement2 })
  
  // Create provider configs
  const thunesConfig = await prisma.providerConfig.upsert({
    where: { name: 'THUNES' },
    update: {},
    create: {
      name: 'THUNES',
      baseUrl: 'https://sandbox.thunes.com/api',
      apiKey: 'sandbox-key',
      apiSecret: 'sandbox-secret',
      walletCurrency: 'EUR',
      active: true,
    },
  })
  
  const rapydConfig = await prisma.providerConfig.upsert({
    where: { name: 'RAPYD' },
    update: {},
    create: {
      name: 'RAPYD',
      baseUrl: 'https://sandboxapi.rapyd.net',
      apiKey: 'sandbox-key',
      apiSecret: 'sandbox-secret',
      walletCurrency: 'EUR',
      active: false,
    },
  })
  
  console.log('✅ Created provider configs:', { thunesConfig, rapydConfig })
  
  // Create sample SimSnapshot for today
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const snapshot = await prisma.simSnapshot.create({
    data: {
      periodStart: today,
      periodEnd: tomorrow,
      stake: new Decimal(1500000),
      ggr: new Decimal(450000),
      ngr: new Decimal(400000),
      feesPct: new Decimal(5),
      bonusesPct: new Decimal(10),
      taxesPct: new Decimal(20),
      mktPct: new Decimal(20),
      payoutFeesPct: new Decimal(1.2),
      fxPct: new Decimal(0),
      marketingOn: true,
      marketMultiplier: 30,
    },
  })
  
  console.log('✅ Created SimSnapshot:', snapshot)
  
  console.log('🎉 Database seed completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seed error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
