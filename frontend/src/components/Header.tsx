import React from 'react';
import { UserProfile } from '../types';
import { Button } from './UI/Button';
import { Mail, LogOut, ExternalLink, Slack, Layers } from 'lucide-react';

interface HeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onComposeClick: () => void;
  slackConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onComposeClick,
  slackConnected = false
}) => {
  const handleConnectSlack = () => {
    window.location.href = '/api/auth/slack';
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/90 backdrop-blur-md border-b border-[#1f293d]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">OUTBOX</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                ReachInbox Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">Production Email Job Scheduler</p>
          </div>
        </div>

        {/* Action Controls & User Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          <a
            href="/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#131926] hover:bg-[#1a2234] border border-[#1f293d] rounded-lg transition-all"
            title="Open Live Bull Board Queues Dashboard"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Bull Board</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          <button
            onClick={handleConnectSlack}
            className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              slackConnected
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-[#131926] text-slate-300 border-[#1f293d] hover:bg-[#1a2234]'
            }`}
          >
            <Slack className="w-4 h-4 text-emerald-400" />
            <span>{slackConnected ? 'Slack Active' : 'Connect Slack'}</span>
          </button>

          <Button
            onClick={onComposeClick}
            variant="primary"
            size="sm"
            icon={<Mail className="w-4 h-4" />}
          >
            Compose New Email
          </Button>

          {/* User Profile */}
          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-[#1f293d]">
              <img
                src={user.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-blue-500/30"
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
                <p className="text-[11px] text-slate-400 leading-tight">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
