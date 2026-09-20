'use client';

import React, { useState } from 'react';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { ShieldAlert, Lock, KeyRound, ArrowRight, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { profile, switchProfile } = useActiveProfile();
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const isDinu = profile.id === 'dinu';

  const handleQuickSwitch = () => {
    switchProfile('dinu');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;

    setIsVerifying(true);
    setPinError(false);

    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });

      if (res.ok) {
        setIsPinUnlocked(true);
        setPinError(false);
        switchProfile('dinu');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.error || 'Invalid PIN');
        setPinError(true);
      }
    } catch {
      setErrorMessage('Verification connection failed');
      setPinError(true);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isDinu || isPinUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-[#090e17]/95 border border-sky-500/25 rounded-2xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] text-center relative overflow-hidden"
      >
        {/* Neon Accent Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-400/20 text-sky-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_24px_rgba(56,189,248,0.2)]">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight">Private Admin Terminal</h2>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Access to Oracle Cloud NVMe storage, sync queues, and system telemetry is restricted to{' '}
          <span className="text-sky-400 font-semibold">Dinu</span> only.
        </p>

        {/* Current Profile Status */}
        <div className="my-6 p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between text-left">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-9 h-9 rounded-full object-cover border border-rose-400/50"
            />
            <div>
              <p className="text-xs font-semibold text-white">{profile.name}</p>
              <p className="text-[10px] font-mono text-rose-400">Restricted Profile</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
            Locked
          </span>
        </div>

        {/* Action: One-Click Switch to Dinu */}
        <button
          id="btn-admin-switch-dinu"
          type="button"
          onClick={handleQuickSwitch}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-xs shadow-[0_0_20px_rgba(56,189,248,0.3)] transition-all flex items-center justify-center gap-2 cinema-focus group"
        >
          <UserCheck className="w-4 h-4 text-white" />
          <span>Switch to Dinu & Unlock</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Or PIN Bypass */}
        <div className="mt-6 pt-5 border-t border-white/[0.06]">
          <form onSubmit={handlePinSubmit} className="space-y-3">
            <label className="block text-[11px] font-mono text-slate-400 text-left">
              Or enter Master PIN (default: 1337):
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="••••"
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={isVerifying}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-xs font-medium text-white transition-colors disabled:opacity-50"
              >
                {isVerifying ? 'Checking...' : 'Verify'}
              </button>
            </div>
            {pinError && (
              <p className="text-[10px] text-rose-400 text-left flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> {errorMessage || 'Invalid Master PIN. Access restricted.'}
              </p>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};
