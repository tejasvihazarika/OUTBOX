import { Router, Request, Response } from 'express';
import { prisma } from '../services/db';
import { indexEmailJob, searchEmailJobs } from '../services/elasticsearch';
import { addEmailJobToQueue } from '../queue/emailQueue';

const router = Router();

router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const {
      sender,
      recipients,
      subject,
      body,
      scheduledTime,
      delayBetweenEmailsSeconds = 0
    } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required and cannot be empty' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and Body are required' });
    }

    let activeSender = sender;
    if (!activeSender) {
      const defaultSender = await prisma.senderAccount.findFirst({
        where: { isDefault: true }
      });
      activeSender = defaultSender ? defaultSender.email : 'default@ethereal.email';
    }

    const baseScheduledDate = scheduledTime ? new Date(scheduledTime) : new Date();
    const createdJobs = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipientEmail = recipients[i].trim();
      if (!recipientEmail || !recipientEmail.includes('@')) continue;

      const jobScheduledDate = new Date(
        baseScheduledDate.getTime() + i * (delayBetweenEmailsSeconds * 1000)
      );

      const emailJob = await prisma.emailJob.create({
        data: {
          sender: activeSender,
          recipient: recipientEmail,
          subject: subject,
          body: body,
          scheduledTime: jobScheduledDate,
          status: 'SCHEDULED'
        }
      });

      await indexEmailJob(emailJob);

      await addEmailJobToQueue(emailJob.id, jobScheduledDate);

      createdJobs.push(emailJob);
    }

    return res.status(201).json({
      message: `Successfully scheduled ${createdJobs.length} email job(s)`,
      count: createdJobs.length,
      jobs: createdJobs
    });
  } catch (err: any) {
    console.error('[API Error] Schedule email failed:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

router.get('/scheduled', async (_req: Request, res: Response) => {
  try {
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RESCHEDULED'] }
      },
      orderBy: { scheduledTime: 'asc' }
    });
    return res.json({ jobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/sent', async (_req: Request, res: Response) => {
  try {
    const jobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SENT', 'FAILED'] }
      },
      orderBy: { updatedAt: 'desc' }
    });
    return res.json({ jobs });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/search', async (req: Request, res: Response) => {
  try {
    const queryStr = req.query.q ? String(req.query.q).trim() : '';

    try {
      const results = await searchEmailJobs(queryStr);
      return res.json({ query: queryStr, source: 'elasticsearch', results });
    } catch (esErr) {
      console.warn('[API Search] Elasticsearch search failed, using Prisma fallback');
      const dbResults = await prisma.emailJob.findMany({
        where: queryStr ? {
          OR: [
            { recipient: { contains: queryStr } },
            { subject: { contains: queryStr } },
            { sender: { contains: queryStr } },
            { status: { equals: queryStr.toUpperCase() as any } }
          ]
        } : {},
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      return res.json({ query: queryStr, source: 'database_fallback', results: dbResults });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/senders', async (_req: Request, res: Response) => {
  try {
    const senders = await prisma.senderAccount.findMany({
      select: { id: true, email: true, isDefault: true }
    });
    return res.json({ senders });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.emailJob.findUnique({
      where: { id: req.params.id }
    });
    if (!job) {
      return res.status(404).json({ error: 'Email job not found' });
    }
    return res.json({ job });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
