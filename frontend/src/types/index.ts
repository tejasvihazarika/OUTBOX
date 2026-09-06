export type EmailStatus = 'SCHEDULED' | 'SENT' | 'FAILED' | 'RESCHEDULED';

export interface EmailJob {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledTime: string;
  status: EmailStatus;
  bullmqJobId?: string | null;
  sentAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SenderAccount {
  id: string;
  email: string;
  isDefault: boolean;
}

export interface UserProfile {
  id?: string;
  googleId?: string;
  email: string;
  name: string;
  picture?: string;
}

export interface ScheduleBatchPayload {
  sender?: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledTime?: string;
  delayBetweenEmailsSeconds?: number;
  hourlyLimitPerSender?: number;
}

export interface SearchResponse {
  query: string;
  source: 'elasticsearch' | 'database_fallback';
  results: EmailJob[];
}
