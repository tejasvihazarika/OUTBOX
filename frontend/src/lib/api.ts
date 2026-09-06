import axios from 'axios';
import { ScheduleBatchPayload, EmailJob, SenderAccount, UserProfile, SearchResponse } from '../types';

const API = axios.create({
  baseURL: '/api',
  withCredentials: true
});

export const api = {
  // Auth
  loginGoogle: async (credential?: string, mockUser?: Partial<UserProfile>) => {
    const res = await API.post('/auth/google', { credential, mockUser });
    return res.data;
  },
  getMe: async () => {
    const res = await API.get('/auth/me');
    return res.data;
  },
  logout: async () => {
    const res = await API.post('/auth/logout');
    return res.data;
  },

  // Emails
  scheduleBatch: async (payload: ScheduleBatchPayload) => {
    const res = await API.post('/emails/schedule', payload);
    return res.data;
  },
  getScheduledEmails: async (): Promise<{ jobs: EmailJob[] }> => {
    const res = await API.get('/emails/scheduled');
    return res.data;
  },
  getSentEmails: async (): Promise<{ jobs: EmailJob[] }> => {
    const res = await API.get('/emails/sent');
    return res.data;
  },
  searchEmails: async (q: string): Promise<SearchResponse> => {
    const res = await API.get('/emails/search', { params: { q } });
    return res.data;
  },
  getSenders: async (): Promise<{ senders: SenderAccount[] }> => {
    const res = await API.get('/emails/senders');
    return res.data;
  }
};
