import Redis from 'ioredis';
import { ENV } from '../config/env';

export const redisConnection = new Redis(ENV.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});

redisConnection.on('error', (err) => {
  console.error('[Redis Error]', err.message);
});

redisConnection.on('connect', () => {
  console.log('[Redis] Connected successfully');
});
