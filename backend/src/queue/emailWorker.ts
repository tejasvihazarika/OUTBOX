import { Worker, Job } from 'bullmq';
import { redisConnection } from '../services/redis';
import { prisma } from '../services/db';
import { sendEmail } from '../services/mailer';
import { indexEmailJob } from '../services/elasticsearch';
import { checkSenderRateLimit, incrementSenderRateLimit } from '../services/ratelimit';
import { notifySlack } from '../services/slack';
import { emailQueue, QUEUE_NAME } from './emailQueue';
import { ENV } from '../config/env';

export function setupEmailWorker(): Worker {
  console.log(`[BullMQ Worker] Starting worker with concurrency = ${ENV.WORKER_CONCURRENCY}`);

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const { emailJobId } = job.data;
      console.log(`[BullMQ Worker] Processing job ID: ${job.id} for emailJobId: ${emailJobId}`);

      const emailJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId }
      });

      if (!emailJob) {
        console.warn(`[BullMQ Worker Warning] Email job ${emailJobId} not found in DB. Skipping.`);
        return;
      }

      if (emailJob.status !== 'SCHEDULED' && emailJob.status !== 'RESCHEDULED') {
        console.log(`[BullMQ Worker] Idempotency Guard: Email job ${emailJobId} is in status '${emailJob.status}'. Skipping duplicate/already processed send.`);
        return;
      }

      const rateLimit = await checkSenderRateLimit(emailJob.sender);

      if (!rateLimit.allowed) {
        console.warn(`[BullMQ Worker] Rate limit exceeded for sender ${emailJob.sender} (${rateLimit.currentCount}/${rateLimit.limit} sent in current hour). Rescheduling to ${rateLimit.nextHourTime.toISOString()}`);

        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RESCHEDULED',
            scheduledTime: rateLimit.nextHourTime,
            errorMessage: `Hourly rate limit exceeded (${rateLimit.currentCount}/${rateLimit.limit}). Rescheduled to next hour window.`
          }
        });

        const delayMs = rateLimit.nextHourTime.getTime() - Date.now();
        await emailQueue.add(
          'send-email',
          { emailJobId },
          {
            jobId: `${emailJobId}-rescheduled-${Date.now()}`,
            delay: Math.max(0, delayMs)
          }
        );

        await indexEmailJob(updatedJob);

        await notifySlack(
          emailJob.sender,
          `Sender hourly cap (${rateLimit.limit} emails/hr) reached. Job for recipient \`${emailJob.recipient}\` rescheduled to ${rateLimit.nextHourTime.toISOString()}.`
        );

        return;
      }

      try {
        await incrementSenderRateLimit(emailJob.sender);

        const sendResult = await sendEmail(emailJob.sender, emailJob.recipient, emailJob.subject, emailJob.body);

        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            bullmqJobId: job.id,
            sentAt: new Date(),
            errorMessage: null
          }
        });

        await indexEmailJob(updatedJob);

        console.log(`[BullMQ Worker] Successfully sent email ${emailJobId} to ${emailJob.recipient}. Preview: ${sendResult.previewUrl || 'N/A'}`);
      } catch (err: any) {
        console.error(`[BullMQ Worker Error] Failed to send email ${emailJobId}:`, err.message);

        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            errorMessage: err.message
          }
        });

        await indexEmailJob(updatedJob);
      }
    },
    {
      connection: redisConnection,
      concurrency: ENV.WORKER_CONCURRENCY,
      limiter: {
        max: 1,
        duration: ENV.MIN_DELAY_MS_BETWEEN_SENDS
      }
    }
  );

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[BullMQ Worker] Job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
}
