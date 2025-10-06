import { Queue, Worker, QueueEvents } from 'bullmq'
import IORedis from 'ioredis'
import { logger } from '../lib/logger'
import { processSettlementJob } from './settlement.closeDay'
import { processPayoutJob } from './payout.submit'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const redisOptions = {
  maxRetriesPerRequest: null,
}

// Create Redis connection
export const redis = new IORedis(redisUrl, redisOptions)

// Create queues
export const settlementQueue = new Queue('settlement', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

export const payoutQueue = new Queue('payout', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

// Queue events for monitoring
export const settlementQueueEvents = new QueueEvents('settlement', {
  connection: redis,
})

export const payoutQueueEvents = new QueueEvents('payout', {
  connection: redis,
})

// Workers
export function startWorkers(): void {
  const settlementWorker = new Worker(
    'settlement',
    async (job) => {
      logger.info({ msg: 'Processing settlement job', jobId: job.id, data: job.data })
      return processSettlementJob(job.data)
    },
    {
      connection: redis,
      concurrency: 1, // Process settlements sequentially
    }
  )
  
  const payoutWorker = new Worker(
    'payout',
    async (job) => {
      logger.info({ msg: 'Processing payout job', jobId: job.id, data: job.data })
      return processPayoutJob(job.data)
    },
    {
      connection: redis,
      concurrency: 5, // Process up to 5 payouts in parallel
    }
  )
  
  // Worker event handlers
  settlementWorker.on('completed', (job) => {
    logger.info({ msg: 'Settlement job completed', jobId: job.id })
  })
  
  settlementWorker.on('failed', (job, err) => {
    logger.error({ msg: 'Settlement job failed', jobId: job?.id, error: err.message })
  })
  
  payoutWorker.on('completed', (job) => {
    logger.info({ msg: 'Payout job completed', jobId: job.id })
  })
  
  payoutWorker.on('failed', (job, err) => {
    logger.error({ msg: 'Payout job failed', jobId: job?.id, error: err.message })
  })
  
  logger.info('Workers started successfully')
}

// Graceful shutdown
export async function stopWorkers(): Promise<void> {
  await settlementQueue.close()
  await payoutQueue.close()
  await redis.quit()
  logger.info('Workers stopped successfully')
}
