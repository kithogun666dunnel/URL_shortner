import { Queue, Worker, Job } from 'bullmq';
import { prisma } from './prisma';

const connection = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
};

export interface ClickJobData {
  urlId: number;
  ip: string;
  userAgent: string;
}

export const analyticsQueue = new Queue<ClickJobData>('analytics', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  },
});

const worker = new Worker<ClickJobData>(
  'analytics',
  async (job: Job<ClickJobData>) => {
    const { urlId, ip, userAgent } = job.data;
    await prisma.click.create({ data: { urlId, ip, userAgent } });
  },
  { connection }
);

worker.on('failed', (job, err) => {
  console.error(`[analytics:worker] job ${job?.id} failed:`, err.message);
});

export default analyticsQueue;
