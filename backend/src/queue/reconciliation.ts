import { prisma } from '../services/db';
import { emailQueue, addEmailJobToQueue } from './emailQueue';

export async function reconcileScheduledJobs(): Promise<void> {
  console.log('[Reconciliation] Running worker startup reconciliation check...');
  
  try {
    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RESCHEDULED'] }
      }
    });

    console.log(`[Reconciliation] Found ${pendingJobs.length} scheduled/rescheduled jobs in database.`);

    let reconciledCount = 0;
    let skippedCount = 0;

    for (const job of pendingJobs) {
      const existingBullMQJob = await emailQueue.getJob(job.id);
      const existingByBullId = job.bullmqJobId ? await emailQueue.getJob(job.bullmqJobId) : null;

      if (existingBullMQJob || existingByBullId) {
        skippedCount++;
      } else {
        await addEmailJobToQueue(job.id, job.scheduledTime);
        reconciledCount++;
      }
    }

    console.log(`[Reconciliation] Startup check complete. Re-enqueued: ${reconciledCount}, Preserved in BullMQ: ${skippedCount}.`);
  } catch (err: any) {
    console.error('[Reconciliation Error] Failed to complete startup reconciliation:', err.message);
  }
}
