-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('MOBILE_MONEY', 'BANK');
CREATE TYPE "KycStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'FINALIZED', 'PAID', 'PARTIAL', 'FAILED');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'SUBMITTED', 'SETTLED', 'FAILED');
CREATE TYPE "LedgerAccount" AS ENUM ('NGR', 'TAX', 'MKT', 'INVESTOR', 'COMPANY', 'FEES', 'RESERVE');
CREATE TYPE "LedgerSide" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "PayoutFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
CREATE TYPE "InvestorBasis" AS ENUM ('NGR', 'NGR_NET');
CREATE TYPE "ProviderName" AS ENUM ('THUNES', 'RAPYD');

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneOrIban" TEXT NOT NULL,
    "walletType" "WalletType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorAgreement" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "sharePercent" DECIMAL(65,30) NOT NULL DEFAULT 25,
    "basis" "InvestorBasis" NOT NULL DEFAULT 'NGR_NET',
    "minPayoutThreshold" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "payoutFrequency" "PayoutFrequency" NOT NULL DEFAULT 'DAILY',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestorAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account" "LedgerAccount" NOT NULL,
    "investorId" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "ref" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "side" "LedgerSide" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementRun" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "totalsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutInstruction" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "provider" "ProviderName" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "fee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "fxRate" DECIMAL(65,30) NOT NULL DEFAULT 1,
    "externalId" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutInstruction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "name" "ProviderName" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "walletCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimSnapshot" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "stake" DECIMAL(65,30) NOT NULL,
    "ggr" DECIMAL(65,30) NOT NULL,
    "ngr" DECIMAL(65,30) NOT NULL,
    "feesPct" DECIMAL(65,30) NOT NULL DEFAULT 5,
    "bonusesPct" DECIMAL(65,30) NOT NULL DEFAULT 10,
    "taxesPct" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "mktPct" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "payoutFeesPct" DECIMAL(65,30) NOT NULL DEFAULT 1.2,
    "fxPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "marketingOn" BOOLEAN NOT NULL DEFAULT true,
    "marketMultiplier" INTEGER NOT NULL DEFAULT 30,
    "runId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Investor_kycStatus_idx" ON "Investor"("kycStatus");

-- CreateIndex
CREATE INDEX "InvestorAgreement_investorId_active_idx" ON "InvestorAgreement"("investorId", "active");

-- CreateIndex
CREATE INDEX "LedgerEntry_runId_idx" ON "LedgerEntry"("runId");
CREATE INDEX "LedgerEntry_investorId_idx" ON "LedgerEntry"("investorId");
CREATE INDEX "LedgerEntry_account_idx" ON "LedgerEntry"("account");
CREATE INDEX "LedgerEntry_ts_idx" ON "LedgerEntry"("ts");

-- CreateIndex
CREATE INDEX "SettlementRun_status_idx" ON "SettlementRun"("status");
CREATE INDEX "SettlementRun_periodStart_periodEnd_idx" ON "SettlementRun"("periodStart", "periodEnd");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutInstruction_idempotencyKey_key" ON "PayoutInstruction"("idempotencyKey");
CREATE INDEX "PayoutInstruction_status_idx" ON "PayoutInstruction"("status");
CREATE INDEX "PayoutInstruction_runId_idx" ON "PayoutInstruction"("runId");
CREATE INDEX "PayoutInstruction_investorId_idx" ON "PayoutInstruction"("investorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConfig_name_key" ON "ProviderConfig"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SimSnapshot_runId_key" ON "SimSnapshot"("runId");
CREATE INDEX "SimSnapshot_periodStart_periodEnd_idx" ON "SimSnapshot"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "InvestorAgreement" ADD CONSTRAINT "InvestorAgreement_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SettlementRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutInstruction" ADD CONSTRAINT "PayoutInstruction_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutInstruction" ADD CONSTRAINT "PayoutInstruction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SettlementRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimSnapshot" ADD CONSTRAINT "SimSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SettlementRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
