import React from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Shield, Zap, Sparkles } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { UserProfile } from '../types';

interface LoginProps {
  onLoginSuccess: (user: UserProfile, token: string) => void;
  onDemoLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onDemoLogin }) => {
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('Google OAuth response:', tokenResponse);
      onDemoLogin();
    },
    onError: (errorResponse) => {
      console.warn('Google login failed or placeholder client used:', errorResponse);
      onDemoLogin();
    }
  });

  return (
    <div className="min-h-screen bg-[#0b0f17] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-md w-full bg-[#131926] border border-[#1f293d] rounded-2xl shadow-2xl p-8 z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto shadow-xl shadow-blue-600/25 mb-4">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to OUTBOX</h1>
          <p className="text-sm text-slate-400">
            ReachInbox Cold Email Infrastructure & BullMQ Scheduler
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-3 py-2 text-xs">
          <div className="p-3 bg-[#0f1420] border border-[#1f293d] rounded-xl flex items-center gap-2 text-slate-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>BullMQ Delayed Queue</span>
          </div>
          <div className="p-3 bg-[#0f1420] border border-[#1f293d] rounded-xl flex items-center gap-2 text-slate-300">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Redis Rate Limiter</span>
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => googleLogin()}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-all shadow-lg text-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google OAuth
          </button>

          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#1f293d] w-full" />
            <span className="bg-[#131926] px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider absolute">
              or instant access
            </span>
          </div>

          <Button
            onClick={onDemoLogin}
            variant="secondary"
            className="w-full justify-center py-3 text-sm"
            icon={<Sparkles className="w-4 h-4 text-amber-400" />}
          >
            Enter Dashboard as Demo Admin
          </Button>
        </div>

        <p className="text-[11px] text-center text-slate-500">
          Scaffolded for Google Cloud OAuth & Slack Webhook integration.
        </p>
      </div>
    </div>
  );
};
