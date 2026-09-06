import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const ENV = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'mysql://outbox:outbox@localhost:3306/outbox',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  MIN_DELAY_MS_BETWEEN_SENDS: parseInt(process.env.MIN_DELAY_MS_BETWEEN_SENDS || '2000', 10),
  MAX_EMAILS_PER_HOUR_PER_SENDER: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '10', 10),
  JWT_SECRET: process.env.JWT_SECRET || 'outbox-super-secret-key-2026',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_GOOGLE_CLIENT_SECRET',
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || 'PLACEHOLDER_SLACK_CLIENT_ID',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || 'PLACEHOLDER_SLACK_CLIENT_SECRET',
  SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI || 'http://localhost:4000/api/auth/slack/callback',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173'
};
