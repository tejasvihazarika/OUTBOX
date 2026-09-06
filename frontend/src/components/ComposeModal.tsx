import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Modal } from './UI/Modal';
import { Button } from './UI/Button';
import { Input } from './UI/Input';
import { SenderAccount, ScheduleBatchPayload } from '../types';
import { Upload, AlertTriangle, CheckCircle2, Clock, Zap, Mail, ShieldAlert } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: SenderAccount[];
  onSchedule: (payload: ScheduleBatchPayload) => Promise<void>;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  onSchedule
}) => {
  const [selectedSender, setSelectedSender] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [manualRecipients, setManualRecipients] = useState('');
  const [parsedEmails, setParsedEmails] = useState<string[]>([]);
  const [warningCount, setWarningCount] = useState<number>(0);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  useEffect(() => {
    if (senders.length > 0 && !selectedSender) {
      const defaultAcc = senders.find((s) => s.isDefault) || senders[0];
      setSelectedSender(defaultAcc.email);
    }
  }, [senders, selectedSender]);

  useEffect(() => {
    if (isOpen && !scheduledTime) {
      // Default to 1 minute in future
      const now = new Date();
      now.setMinutes(now.getMinutes() + 1);
      const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledTime(isoLocal);
    }
  }, [isOpen, scheduledTime]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      complete: (results) => {
        const rawStrings: string[] = [];
        results.data.forEach((row: any) => {
          if (typeof row === 'string') {
            rawStrings.push(row);
          } else if (Array.isArray(row)) {
            row.forEach((cell) => cell && rawStrings.push(String(cell)));
          } else if (typeof row === 'object' && row !== null) {
            Object.values(row).forEach((val) => val && rawStrings.push(String(val)));
          }
        });

        const valid: string[] = [];
        let warnings = 0;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        rawStrings.forEach((item) => {
          const trimmed = item.trim().replace(/['"]/g, '');
          if (!trimmed) return;
          if (emailRegex.test(trimmed)) {
            if (!valid.includes(trimmed)) valid.push(trimmed);
          } else if (trimmed.includes('@')) {
            warnings++;
          }
        });

        setParsedEmails(valid);
        setWarningCount(warnings);
      },
      error: (err) => {
        console.error('PapaParse error:', err);
      }
    });
  };

  const getCombinedRecipients = (): string[] => {
    const manualList = manualRecipients
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e && e.includes('@'));

    const combined = Array.from(new Set([...parsedEmails, ...manualList]));
    return combined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = getCombinedRecipients();

    if (recipients.length === 0) {
      alert('Please enter or upload at least one valid recipient email address.');
      return;
    }

    if (!subject.trim() || !body.trim()) {
      alert('Please provide both Subject and Body for the email.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSchedule({
        sender: selectedSender,
        recipients,
        subject,
        body,
        scheduledTime: new Date(scheduledTime).toISOString(),
        delayBetweenEmailsSeconds: delaySeconds,
        hourlyLimitPerSender: hourlyLimit
      });

      // Reset form
      setSubject('');
      setBody('');
      setManualRecipients('');
      setParsedEmails([]);
      setFileName('');
      setWarningCount(0);
      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRecipientsCount = getCombinedRecipients().length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compose New Email Batch" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sender Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Sender Account (SMTP)
          </label>
          <select
            value={selectedSender}
            onChange={(e) => setSelectedSender(e.target.value)}
            className="w-full bg-[#131926] border border-[#1f293d] rounded-lg text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {senders.map((s) => (
              <option key={s.id} value={s.email}>
                {s.email} {s.isDefault ? '(Default Ethereal Account)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* CSV Lead Upload */}
        <div className="p-4 bg-[#0f1420] border border-[#1f293d] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-blue-400" />
              Upload CSV / Text Lead List
            </label>
            {fileName && <span className="text-xs text-blue-400 font-medium">{fileName}</span>}
          </div>

          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 cursor-pointer"
          />

          {/* Upload summary counters */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>{parsedEmails.length} Valid CSV Emails</span>
            </div>
            {warningCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>{warningCount} Malformed Rows Skipped</span>
              </div>
            )}
          </div>
        </div>

        {/* Manual Input Fallback / Additional */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Recipients (Manual paste or comma/newline separated)
          </label>
          <textarea
            rows={2}
            value={manualRecipients}
            onChange={(e) => setManualRecipients(e.target.value)}
            placeholder="e.g. john@example.com, sarah@company.io"
            className="w-full bg-[#131926] border border-[#1f293d] rounded-lg text-slate-100 p-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-400 flex items-center justify-between">
            <span>Total Active Recipients: <strong className="text-blue-400">{activeRecipientsCount}</strong></span>
          </p>
        </div>

        {/* Subject */}
        <Input
          label="Subject"
          placeholder="e.g. Quick question regarding cold email infrastructure"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />

        {/* Body */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Email Content (Plain text or HTML)
          </label>
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Hi {{name}}, I noticed your recent work and wanted to connect..."
            className="w-full bg-[#131926] border border-[#1f293d] rounded-lg text-slate-100 p-3 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Scheduling & Rate Limiting Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[#0f1420] border border-[#1f293d] rounded-xl">
          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Start Time
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full bg-[#131926] border border-[#1f293d] rounded-md text-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Delay (sec)
            </label>
            <input
              type="number"
              min="0"
              max="3600"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseInt(e.target.value, 10) || 0)}
              className="w-full bg-[#131926] border border-[#1f293d] rounded-md text-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase text-slate-400 mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" /> Hourly Cap
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value, 10) || 10)}
              className="w-full bg-[#131926] border border-[#1f293d] rounded-md text-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1f293d]">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting} icon={<Mail className="w-4 h-4" />}>
            Schedule {activeRecipientsCount} Email{activeRecipientsCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
