import { redisConnection } from './redis';
import { ENV } from '../config/env';

export function getHourWindowString(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${hh}`;
}

export function getNextHourWindowTime(date: Date = new Date()): Date {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return nextHour;
}

export function getSecondsUntilNextHour(date: Date = new Date()): number {
  const nextHour = getNextHourWindowTime(date);
  return Math.ceil((nextHour.getTime() - date.getTime()) / 1000);
}

export async function checkSenderRateLimit(senderEmail: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  nextHourTime: Date;
}> {
  const hourKey = getHourWindowString();
  const redisKey = `ratelimit:${senderEmail}:${hourKey}`;
  
  const rawCount = await redisConnection.get(redisKey);
  const currentCount = rawCount ? parseInt(rawCount, 10) : 0;
  const limit = ENV.MAX_EMAILS_PER_HOUR_PER_SENDER;
  const nextHourTime = getNextHourWindowTime();

  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
    nextHourTime
  };
}

export async function incrementSenderRateLimit(senderEmail: string): Promise<number> {
  const hourKey = getHourWindowString();
  const redisKey = `ratelimit:${senderEmail}:${hourKey}`;
  
  const count = await redisConnection.incr(redisKey);
  
  if (count === 1) {
    const ttlSeconds = getSecondsUntilNextHour();
    await redisConnection.expire(redisKey, ttlSeconds);
  }
  
  return count;
}
