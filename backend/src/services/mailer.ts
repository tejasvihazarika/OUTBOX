import nodemailer from 'nodemailer';
import { prisma } from './db';

const transporters: Map<string, nodemailer.Transporter> = new Map();

export async function initMailer(): Promise<void> {
  console.log('[Mailer] Initializing Nodemailer Ethereal SMTP accounts...');
  
  const existingSenders = await prisma.senderAccount.findMany();
  
  if (existingSenders.length === 0) {
    console.log('[Mailer] No senders found in database. Generating 2 automatic Ethereal test accounts...');
    
    for (let i = 1; i <= 2; i++) {
      const testAccount = await nodemailer.createTestAccount();
      await prisma.senderAccount.create({
        data: {
          email: testAccount.user,
          smtpHost: testAccount.smtp.host,
          smtpPort: testAccount.smtp.port,
          smtpUser: testAccount.user,
          smtpPass: testAccount.pass,
          isDefault: i === 1
        }
      });
      console.log(`[Mailer] Created Ethereal Account #${i}: ${testAccount.user} (pass: ${testAccount.pass})`);
    }
  }

  const senders = await prisma.senderAccount.findMany();
  for (const sender of senders) {
    const transporter = nodemailer.createTransport({
      host: sender.smtpHost,
      port: sender.smtpPort,
      secure: sender.smtpPort === 465,
      auth: {
        user: sender.smtpUser,
        pass: sender.smtpPass
      }
    });
    transporters.set(sender.email, transporter);
    console.log(`[Mailer] Transport configured for: ${sender.email}`);
  }
}

export async function sendEmail(senderEmail: string, recipient: string, subject: string, body: string): Promise<{ messageId: string; previewUrl: string | false }> {
  let transporter = transporters.get(senderEmail);

  if (!transporter) {
    const senderAcc = await prisma.senderAccount.findFirst({
      where: { OR: [{ email: senderEmail }, { isDefault: true }] }
    });

    if (senderAcc) {
      transporter = nodemailer.createTransport({
        host: senderAcc.smtpHost,
        port: senderAcc.smtpPort,
        secure: senderAcc.smtpPort === 465,
        auth: {
          user: senderAcc.smtpUser,
          pass: senderAcc.smtpPass
        }
      });
      transporters.set(senderAcc.email, transporter);
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.port === 465,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      transporters.set(senderEmail, transporter);
    }
  }

  const info = await transporter.sendMail({
    from: `"ReachInbox Outbox" <${senderEmail}>`,
    to: recipient,
    subject: subject,
    text: body,
    html: `<div style="font-family: sans-serif; padding: 20px;">
      <h2>${subject}</h2>
      <p style="white-space: pre-wrap;">${body}</p>
      <hr />
      <p style="font-size: 12px; color: #888;">Sent via ReachInbox Outbox Email Scheduler</p>
    </div>`
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`[Mailer Preview] Ethereal URL for email to ${recipient}: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl
  };
}
