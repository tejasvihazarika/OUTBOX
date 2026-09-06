import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Header } from '../components/Header';
import { ComposeModal } from '../components/ComposeModal';
import { Badge } from '../components/UI/Badge';
import { TableSkeleton } from '../components/UI/Skeleton';
import { Button } from '../components/UI/Button';
import { EmailJob, SenderAccount, UserProfile, ScheduleBatchPayload } from '../types';
import { api } from '../lib/api';
import {
  Search,
  Plus,
  RefreshCw,
  Mail,
  CheckCircle2,
  Clock,
  AlertOctagon,
  ExternalLink,
  Layers,
  Database,
  Sparkles
} from 'lucide-react';

interface DashboardProps {
  user: UserProfile;
  onLogout: () => void;
  onShowToast: (message: string, type?: 'success' | 'error') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout, onShowToast }) => {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledJobs, setScheduledJobs] = useState<EmailJob[]>([]);
  const [sentJobs, setSentJobs] = useState<EmailJob[]>([]);
  const [searchResults, setSearchResults] = useState<EmailJob[] | null>(null);
  const [searchSource, setSearchSource] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [slackConnected, setSlackConnected] = useState<boolean>(false);

  const fetchEmailData = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const [schedRes, sentRes, senderRes] = await Promise.all([
        api.getScheduledEmails(),
        api.getSentEmails(),
        api.getSenders()
      ]);
      setScheduledJobs(schedRes.jobs || []);
      setSentJobs(sentRes.jobs || []);
      setSenders(senderRes.senders || []);
    } catch (err: any) {
      console.error('Failed to load email jobs:', err);
      if (!quiet) onShowToast(err.message || 'Failed to fetch email jobs', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    fetchEmailData();

    // Check query params for Slack OAuth status
    const params = new URLSearchParams(window.location.search);
    if (params.get('slack') === 'success') {
      setSlackConnected(true);
      onShowToast('Slack OAuth connected successfully! Rate-limit alerts active.', 'success');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('slack') === 'error') {
      onShowToast(`Slack connection notice: ${params.get('msg') || 'Check app credentials'}`, 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Auto-poll every 5 seconds for status updates
    const interval = setInterval(() => {
      fetchEmailData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchEmailData, onShowToast]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearchSource('');
      return;
    }

    try {
      const res = await api.searchEmails(searchQuery);
      setSearchResults(res.results || []);
      setSearchSource(res.source);
    } catch (err: any) {
      onShowToast(`Elasticsearch Query Error: ${err.message}`, 'error');
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchSource('');
  };

  const handleScheduleSubmit = async (payload: ScheduleBatchPayload) => {
    try {
      const res = await api.scheduleBatch(payload);
      onShowToast(`Successfully scheduled ${res.count} email job(s)!`, 'success');
      fetchEmailData(true);
    } catch (err: any) {
      onShowToast(err.response?.data?.error || err.message || 'Failed to schedule email batch', 'error');
      throw err;
    }
  };

  const currentList = searchResults !== null
    ? searchResults
    : activeTab === 'scheduled'
    ? scheduledJobs
    : sentJobs;

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col">
      <Header
        user={user}
        onLogout={onLogout}
        onComposeClick={() => setIsComposeOpen(true)}
        slackConnected={slackConnected}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-[#131926] border border-[#1f293d] rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Scheduled Queue</p>
              <h3 className="text-2xl font-bold text-white">{scheduledJobs.length}</h3>
            </div>
          </div>

          <div className="p-5 bg-[#131926] border border-[#1f293d] rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sent Emails</p>
              <h3 className="text-2xl font-bold text-white">
                {sentJobs.filter((j) => j.status === 'SENT').length}
              </h3>
            </div>
          </div>

          <div className="p-5 bg-[#131926] border border-[#1f293d] rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rescheduled (Cap Hit)</p>
              <h3 className="text-2xl font-bold text-white">
                {scheduledJobs.filter((j) => j.status === 'RESCHEDULED').length}
              </h3>
            </div>
          </div>

          <div className="p-5 bg-[#131926] border border-[#1f293d] rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Failed Delivery</p>
              <h3 className="text-2xl font-bold text-white">
                {sentJobs.filter((j) => j.status === 'FAILED').length}
              </h3>
            </div>
          </div>
        </div>

        {/* Dashboard Bar: Tabs & Search */}
        <div className="bg-[#131926] border border-[#1f293d] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-[#0f1420] p-1.5 rounded-xl border border-[#1f293d] w-full md:w-auto">
            <button
              onClick={() => {
                setActiveTab('scheduled');
                setSearchResults(null);
              }}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'scheduled' && searchResults === null
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Scheduled Emails ({scheduledJobs.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('sent');
                setSearchResults(null);
              }}
              className={`flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                activeTab === 'sent' && searchResults === null
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Sent Emails ({sentJobs.length})</span>
            </button>
          </div>

          {/* Elasticsearch Search Input */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-96">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search subject, recipient, status (Elasticsearch)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0f1420] border border-[#1f293d] rounded-xl text-slate-200 placeholder-slate-500 pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchEmailData()}
              isLoading={isRefreshing}
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </form>
        </div>

        {/* Search Source Banner */}
        {searchResults !== null && (
          <div className="flex items-center justify-between px-4 py-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span>
                Showing Elasticsearch search results for: <strong>"{searchQuery}"</strong> ({searchResults.length} matches)
              </span>
            </div>
            <button
              onClick={handleClearSearch}
              className="text-blue-400 hover:underline font-semibold"
            >
              Clear Search
            </button>
          </div>
        )}

        {/* Emails Table / Skeleton / Empty State */}
        <div className="bg-[#131926] border border-[#1f293d] rounded-2xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-6">
              <TableSkeleton rows={5} />
            </div>
          ) : currentList.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center mx-auto border border-slate-700/50">
                <Mail className="w-8 h-8" />
              </div>
              <div className="max-w-xs mx-auto">
                <h4 className="text-base font-semibold text-white">
                  {searchResults !== null
                    ? 'No matching search results'
                    : activeTab === 'scheduled'
                    ? 'No scheduled emails yet'
                    : 'No sent emails yet'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {searchResults !== null
                    ? 'Try searching with a different recipient email or subject phrase.'
                    : activeTab === 'scheduled'
                    ? 'Click the Compose button above to schedule your first batch of cold emails.'
                    : 'Emails will appear here once sent by the BullMQ background worker.'}
                </p>
              </div>
              {searchResults === null && activeTab === 'scheduled' && (
                <Button
                  onClick={() => setIsComposeOpen(true)}
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                >
                  Schedule Your First Email
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0f1420] border-b border-[#1f293d] text-slate-400 uppercase font-semibold text-[11px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Recipient</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Sender</th>
                    <th className="px-6 py-4">
                      {activeTab === 'scheduled' ? 'Scheduled Time' : 'Processed Time'}
                    </th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f293d]">
                  {currentList.map((job) => (
                    <tr key={job.id} className="hover:bg-[#1a2234]/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs uppercase border border-blue-500/20">
                            {job.recipient.charAt(0)}
                          </div>
                          <span>{job.recipient}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate" title={job.subject}>
                        <span className="font-semibold text-slate-200">{job.subject}</span>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{job.body}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                        {job.sender}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {job.status === 'SENT' && job.sentAt
                          ? format(new Date(job.sentAt), 'MMM dd, yyyy HH:mm:ss')
                          : format(new Date(job.scheduledTime), 'MMM dd, yyyy HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4">
                        <Badge status={job.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        {job.errorMessage ? (
                          <span
                            className="text-amber-400 text-[11px] font-mono cursor-pointer hover:underline"
                            title={job.errorMessage}
                          >
                            Limit Rescheduled
                          </span>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">
                            {job.bullmqJobId ? `Job #${job.bullmqJobId.slice(0, 8)}` : 'Queued'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onSchedule={handleScheduleSubmit}
      />
    </div>
  );
};
