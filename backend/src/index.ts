import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env';
import { prisma } from './services/db';
import { initElasticsearch } from './services/elasticsearch';
import { initMailer } from './services/mailer';
import { setupEmailWorker } from './queue/emailWorker';
import { reconcileScheduledJobs } from './queue/reconciliation';

import emailRoutes from './routes/emailRoutes';
import authRoutes from './routes/authRoutes';
import bullBoardRouter from './routes/bullBoard';

const app = express();

app.use(cors({
  origin: [ENV.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use('/admin/queues', bullBoardRouter);
app.use('/api/emails', emailRoutes);
app.use('/api/auth', authRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  try {
    console.log('[Server Startup] Connecting to MySQL Database...');
    await prisma.$connect();
    console.log('[Server Startup] MySQL Connected successfully.');

    await initElasticsearch();
    await initMailer();

    setupEmailWorker();

    await reconcileScheduledJobs();

    app.listen(ENV.PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 OUTBOX Backend API running at http://localhost:${ENV.PORT}`);
      console.log(`📊 Bull Board Dashboard running at http://localhost:${ENV.PORT}/admin/queues`);
      console.log(`=======================================================`);
    });
  } catch (err: any) {
    console.error('[Server Startup Error] Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();
