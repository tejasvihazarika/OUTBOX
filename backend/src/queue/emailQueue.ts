import { Queue } from 'bullmq';
import { redisConnection } from '../services/redis';
import { ENV } from '../config/env';

export const QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200
  }
});

export async function addEmailJobToQueue(emailJobId: string, scheduledTime: Date): Promise<void> {
  const now = Date.now();
  const delay = Math.max(0, scheduledTime.getTime() - now);

  await emailQueue.add(
    'send-email',
    { emailJobId },
    {
      jobId: emailJobId,
      delay
    }
  );
  console.log(`[BullMQ Queue] Scheduled job ${emailJobId} with delay ${delay}ms`);
}
