import axios from 'axios';
import { ScheduleBatchPayload, EmailJob, SenderAccount, UserProfile, SearchResponse } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const API = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

const isStaticHost = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

const DEFAULT_DEMO_USER: UserProfile = {
  id: 'demo-admin-1',
  name: 'ReachInbox Admin User',
  email: 'admin@reachinbox.ai',
  picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
};

const DEFAULT_DEMO_SENDERS: SenderAccount[] = [
  { id: 'sender-1', email: 'ethereal-sender-1@reachinbox.ai', isDefault: true },
  { id: 'sender-2', email: 'ethereal-sender-2@reachinbox.ai', isDefault: false }
];

const getStoredJobs = (): EmailJob[] => {
  try {
    const raw = localStorage.getItem('outbox_demo_jobs');
    const nowIso = new Date().toISOString();
    return raw ? JSON.parse(raw) : [
      {
        id: 'demo-job-1',
        sender: 'ethereal-sender-1@reachinbox.ai',
        recipient: 'tejasvi@example.com',
        subject: 'Demo Cold Email — Welcome to ReachInbox Outbox',
        body: 'Hello Tejasvi,\n\nThis is a scheduled email demo running on ReachInbox Outbox infrastructure.',
        scheduledTime: new Date(Date.now() + 600000).toISOString(),
        status: 'SCHEDULED',
        createdAt: nowIso,
        updatedAt: nowIso
      },
      {
        id: 'demo-job-2',
        sender: 'ethereal-sender-2@reachinbox.ai',
        recipient: 'alex@startup.io',
        subject: 'ReachInbox Cold Outreach Batch',
        body: 'Hi Alex, exploring automated outreach solutions.',
        scheduledTime: new Date(Date.now() - 3600000).toISOString(),
        status: 'SENT',
        sentAt: new Date(Date.now() - 3590000).toISOString(),
        createdAt: new Date(Date.now() - 4000000).toISOString(),
        updatedAt: nowIso
      }
    ];
  } catch {
    return [];
  }
};

const saveStoredJobs = (jobs: EmailJob[]) => {
  try {
    localStorage.setItem('outbox_demo_jobs', JSON.stringify(jobs));
  } catch (e) {
    console.error('Failed to save demo jobs', e);
  }
};

export const api = {
  // Auth
  loginGoogle: async (credential?: string, mockUser?: Partial<UserProfile>) => {
    try {
      if (isStaticHost) throw new Error('Static host — fallback to local demo');
      const res = await API.post('/auth/google', { credential, mockUser });
      return res.data;
    } catch (err) {
      const user = { ...DEFAULT_DEMO_USER, ...mockUser };
      localStorage.setItem('outbox_demo_user', JSON.stringify(user));
      return { authenticated: true, user };
    }
  },

  getMe: async () => {
    try {
      if (isStaticHost) throw new Error('Static host');
      const res = await API.get('/auth/me');
      return res.data;
    } catch (err) {
      const stored = localStorage.getItem('outbox_demo_user');
      if (stored) {
        return { authenticated: true, user: JSON.parse(stored) };
      }
      return { authenticated: false };
    }
  },

  logout: async () => {
    try {
      if (!isStaticHost) await API.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('outbox_demo_user');
    return { success: true };
  },

  // Emails
  scheduleBatch: async (payload: ScheduleBatchPayload) => {
    try {
      if (isStaticHost) throw new Error('Static host fallback');
      const res = await API.post('/emails/schedule', payload);
      return res.data;
    } catch (err) {
      const existing = getStoredJobs();
      const now = new Date();
      const startTime = payload.scheduledTime ? new Date(payload.scheduledTime) : now;
      const delayMs = (payload.delayBetweenEmailsSeconds || 2) * 1000;

      const newJobs: EmailJob[] = payload.recipients.map((recipient, idx) => {
        const scheduledTime = new Date(startTime.getTime() + idx * delayMs).toISOString();
        const nowIso = now.toISOString();
        return {
          id: `demo-job-${Date.now()}-${idx}`,
          sender: payload.sender || DEFAULT_DEMO_SENDERS[idx % DEFAULT_DEMO_SENDERS.length].email,
          recipient,
          subject: payload.subject,
          body: payload.body,
          scheduledTime,
          status: 'SCHEDULED',
          createdAt: nowIso,
          updatedAt: nowIso
        };
      });

      const updated = [...newJobs, ...existing];
      saveStoredJobs(updated);

      // Simulate sending transitions after delay
      newJobs.forEach((job) => {
        const timeUntilSend = Math.max(1000, new Date(job.scheduledTime).getTime() - Date.now());
        setTimeout(() => {
          const current = getStoredJobs();
          const target = current.find((j) => j.id === job.id);
          if (target && target.status === 'SCHEDULED') {
            target.status = 'SENT';
            target.sentAt = new Date().toISOString();
            target.updatedAt = new Date().toISOString();
            saveStoredJobs(current);
          }
        }, timeUntilSend);
      });

      return {
        message: `Successfully scheduled ${newJobs.length} email job(s)`,
        jobs: newJobs
      };
    }
  },

  getScheduledEmails: async (): Promise<{ jobs: EmailJob[] }> => {
    try {
      if (isStaticHost) throw new Error('Static host fallback');
      const res = await API.get('/emails/scheduled');
      return res.data;
    } catch (err) {
      const jobs = getStoredJobs().filter((j) => j.status === 'SCHEDULED' || j.status === 'RESCHEDULED');
      return { jobs };
    }
  },

  getSentEmails: async (): Promise<{ jobs: EmailJob[] }> => {
    try {
      if (isStaticHost) throw new Error('Static host fallback');
      const res = await API.get('/emails/sent');
      return res.data;
    } catch (err) {
      const jobs = getStoredJobs().filter((j) => j.status === 'SENT' || j.status === 'FAILED');
      return { jobs };
    }
  },

  searchEmails: async (q: string): Promise<SearchResponse> => {
    try {
      if (isStaticHost) throw new Error('Static host fallback');
      const res = await API.get('/emails/search', { params: { q } });
      return res.data;
    } catch (err) {
      const all = getStoredJobs();
      const query = q.toLowerCase();
      const filtered = all.filter(
        (j) =>
          j.recipient.toLowerCase().includes(query) ||
          j.subject.toLowerCase().includes(query) ||
          j.body.toLowerCase().includes(query) ||
          j.sender.toLowerCase().includes(query) ||
          j.status.toLowerCase().includes(query)
      );
      return {
        query: q,
        source: 'database_fallback',
        results: filtered
      };
    }
  },

  getSenders: async (): Promise<{ senders: SenderAccount[] }> => {
    try {
      if (isStaticHost) throw new Error('Static host fallback');
      const res = await API.get('/emails/senders');
      return res.data;
    } catch (err) {
      return { senders: DEFAULT_DEMO_SENDERS };
    }
  }
};
