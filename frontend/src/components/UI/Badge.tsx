import React from 'react';
import { EmailStatus } from '../../types';

interface BadgeProps {
  status: EmailStatus | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const upper = status.toUpperCase();

  const getStyle = () => {
    switch (upper) {
      case 'SENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'SCHEDULED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'RESCHEDULED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'FAILED':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getDotColor = () => {
    switch (upper) {
      case 'SENT':
        return 'bg-emerald-400';
      case 'SCHEDULED':
        return 'bg-blue-400';
      case 'RESCHEDULED':
        return 'bg-amber-400 animate-pulse';
      case 'FAILED':
        return 'bg-red-400';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${getStyle()} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      {upper}
    </span>
  );
};
