'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PROFILES, PLATFORM_NAME } from '@/lib/constants';
import { Avatar } from '@/components/ui/Avatar';
import { Lock, Sparkles, Film, ArrowRight, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import { profileService } from '@/lib/services/profileService';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [selectedProfile, setSelectedProfile] = useState<'dinu' | 'kanmani' | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileClick = (id: 'dinu' | 'kanmani') => {
    setSelectedProfile(id);
    setError(null);
    setPin('');
    if (id === 'kanmani') {
      // Direct login for Kanmani
      performLogin('kanmani', '');
    }
  };

  const performLogin = async (profileId: 'dinu' | 'kanmani', enteredPin: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, pin: enteredPin }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Sync active profile in profileService
      profileService.switchProfile(profileId);

      // Successfully authenticated! Redirect
      router.push(redirectUrl);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      setLoading(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter your master PIN');
      return;
    }
    if (selectedProfile) {
      performLogin(selectedProfile, pin);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05070c] text-white flex flex-col justify-center items-center px-4 py-12 overflow-hidden selection:bg-rose-500/30">
      {/* Cinematic Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-cyan-600/10 via-rose-600/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 mb-10 sm:mb-14"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md mb-4 text-xs font-medium tracking-wide text-rose-300">
          <Film className="w-3.5 h-3.5 text-rose-400" />
          <span>Private Screening Room</span>
          <span className="w-1 h-1 rounded-full bg-rose-400" />
          <span className="text-slate-300">Dinu & Kanmani</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          {PLATFORM_NAME}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-md mx-auto">
          Dolby Atmos • 4K HDR • Real-Time Synchronized Cinema
        </p>
      </motion.div>

      {/* Main Card / Container */}
      <div className="relative z-10 w-full max-w-xl">
        <AnimatePresence mode="wait">
          {!selectedProfile || (selectedProfile === 'kanmani' && loading) ? (
            /* Profile Selector View */
            <motion.div
              key="select-profile"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0b101b]/80 border border-slate-700/30 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] text-center"
            >
              <h2 className="text-xl font-semibold text-slate-200 mb-2">Who is watching tonight?</h2>
              <p className="text-xs text-slate-400 mb-8">Select your personal cinema profile to enter</p>

              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5 text-left">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                {/* Dinu Profile Card */}
                <button
                  onClick={() => handleProfileClick('dinu')}
                  disabled={loading}
                  className="group relative flex flex-col items-center p-6 rounded-2xl bg-[#121927]/60 hover:bg-[#162134]/90 border border-slate-700/40 hover:border-cyan-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(56,189,248,0.15)] text-left focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <div className="relative mb-4">
                    <Avatar profile={PROFILES.dinu} size="xl" />
                    <span className="absolute -bottom-1 -right-1 p-1 bg-[#090d16] rounded-full border border-slate-700/50 text-cyan-400">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <span className="text-base font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                    Dinu
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Cinema Master</span>
                  <span className="mt-3 px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    PIN Protected
                  </span>
                </button>

                {/* Kanmani Profile Card */}
                <button
                  onClick={() => handleProfileClick('kanmani')}
                  disabled={loading}
                  className="group relative flex flex-col items-center p-6 rounded-2xl bg-[#121927]/60 hover:bg-[#162134]/90 border border-slate-700/40 hover:border-rose-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(244,63,94,0.15)] text-left focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                >
                  <div className="relative mb-4">
                    <Avatar profile={PROFILES.kanmani} size="xl" />
                    <span className="absolute -bottom-1 -right-1 p-1 bg-[#090d16] rounded-full border border-slate-700/50 text-rose-400">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <span className="text-base font-bold text-slate-100 group-hover:text-rose-400 transition-colors">
                    Kanmani
                  </span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Screen Royalty</span>
                  <span className="mt-3 px-2 py-0.5 text-[10px] rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    One-Click Entry
                  </span>
                </button>
              </div>

              {loading && (
                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <div className="w-4 h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                  <span>Entering private cinema...</span>
                </div>
              )}
            </motion.div>
          ) : (
            /* PIN Verification View for Dinu */
            <motion.div
              key="enter-pin"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0b101b]/90 border border-slate-700/40 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)]"
            >
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <Avatar profile={PROFILES[selectedProfile]} size="md" />
                  <div>
                    <h3 className="font-bold text-slate-100">{PROFILES[selectedProfile].name}</h3>
                    <p className="text-xs text-cyan-400">Admin Authorization</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProfile(null);
                    setError(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]"
                >
                  Switch Profile
                </button>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Enter Master PIN
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={8}
                      autoFocus
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="••••"
                      className="w-full bg-[#121927] border border-slate-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-center text-2xl tracking-[0.5em] text-slate-100 placeholder-slate-600 rounded-xl px-4 py-3 outline-none transition-all"
                    />
                    <KeyRound className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm transition-all duration-200 shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Cinema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 text-xs text-slate-500 text-center z-10"
      >
        Private Cloud Architecture • Zero Telemetry • High Bitrate Direct Play
      </motion.p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05070c]" />}>
      <LoginContent />
    </Suspense>
  );
}
