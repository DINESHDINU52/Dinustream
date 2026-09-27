'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '@/types/cinema';
import { Lock, AlertCircle, Loader2, User, KeyRound } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import { profileService } from '@/lib/services/profileService';
import { fetchPublicUsers } from '@/lib/jellyfin/queries';
import { mapUserToProfile } from '@/lib/jellyfin/users';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const [password, setPassword] = useState('');
  const [manualUsername, setManualUsername] = useState('');
  const [manualPassword, setManualPassword] = useState('');

  // Already authenticated? (real mode only) bounce straight through.
  useEffect(() => {
    if (DEMO) return;
    let cancelled = false;
    authService.status().then((status) => {
      if (!cancelled && status.authenticated) router.replace(redirectUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [router, redirectUrl]);

  // Load profiles: mock profiles in demo mode, Jellyfin users otherwise.
  useEffect(() => {
    if (DEMO) {
      setProfiles(profileService.getAllProfiles());
      setLoadingUsers(false);
      const unsub = profileService.subscribe(() => setProfiles(profileService.getAllProfiles()));
      return unsub;
    }

    let cancelled = false;
    fetchPublicUsers()
      .then((users) => {
        if (!cancelled) setProfiles(users.map(mapUserToProfile));
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const finishLogin = async (username: string, pass: string) => {
    setLoading(true);
    setError(null);

    if (DEMO) {
      // Demo: no backend. Switching the local profile is enough.
      profileService.switchProfile(username);
      router.replace(redirectUrl);
      router.refresh();
      setLoading(false);
      return;
    }

    const result = await authService.login(username, pass);
    if (result.ok) {
      router.replace(redirectUrl);
      router.refresh();
    } else {
      setError(result.error || 'Invalid username or password');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPassword('');
      setManualPassword('');
    }
    setLoading(false);
  };

  const handleProfileClick = (profile: UserProfile) => {
    if (profile.pinProtected) {
      setSelectedProfile(profile);
      setPassword('');
      setError(null);
    } else {
      void finishLogin(profile.id, '');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUsername.trim()) return;
    void finishLogin(manualUsername.trim(), manualPassword);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    void finishLogin(selectedProfile.id, password);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#06080d] text-white flex flex-col justify-between select-none overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1424] via-[#06080d] to-[#05070c] pointer-events-none" />

      <header className="relative z-10 w-full px-6 sm:px-12 py-6 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#38bdf8] font-black text-2xl sm:text-3xl tracking-wider">DINUSTREAM</span>
          <span className="hidden sm:inline-block text-[11px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded bg-white/10 text-slate-300">
            Cinema
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-6xl mx-auto w-full">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-5xl font-medium tracking-tight text-white mb-8 sm:mb-12 text-center"
        >
          Who&apos;s watching?
        </motion.h1>

        {loadingUsers ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting to your media server…</span>
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center max-w-md">
            <p className="text-slate-400 text-sm mb-6">
              No profiles found. Your Jellyfin server may not be running, or no users have been created yet.
            </p>
            <button
              onClick={() => setShowManual(true)}
              className="px-6 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-lg text-sm font-semibold transition-colors"
            >
              Sign in manually
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 max-w-4xl">
            {profiles.map((p) => (
              <div
                key={p.id}
                onClick={() => handleProfileClick(p)}
                className="group flex flex-col items-center cursor-pointer"
              >
                <div className="relative w-24 h-24 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-md overflow-hidden bg-[#0b1220] border-2 border-transparent group-hover:border-white transition-all duration-200 group-hover:scale-105 shadow-2xl flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.avatarUrl} alt={p.name} className="w-full h-full object-cover" />
                  {p.pinProtected && (
                    <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/70 backdrop-blur-sm text-slate-300">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <span className="text-slate-400 group-hover:text-white transition-colors duration-200 text-sm sm:text-base md:text-lg text-center mt-3 font-normal truncate max-w-[100px] sm:max-w-[140px]">
                  {p.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {!DEMO && profiles.length > 0 && (
          <div className="mt-12 sm:mt-16">
            <button
              onClick={() => {
                setShowManual(!showManual);
                setError(null);
              }}
              className="px-6 sm:px-8 py-2 text-xs sm:text-sm tracking-widest uppercase transition-all duration-200 font-medium border border-slate-600 text-slate-400 hover:border-white hover:text-white"
            >
              Use another account
            </button>
          </div>
        )}

        {/* Manual username + password (real mode only) */}
        <AnimatePresence>
          {showManual && !DEMO && (
            <motion.form
              onSubmit={handleManualSubmit}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-full max-w-sm mt-8 bg-[#0b1220]/80 border border-white/10 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold">
                <User className="w-4 h-4" />
                Sign in with your Jellyfin account
              </div>
              <input
                type="text"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
                placeholder="Username"
                autoFocus
                required
                className="w-full px-4 py-2.5 bg-[#05070c] border border-white/10 focus:border-sky-400 rounded text-white text-sm outline-none transition-colors"
              />
              <input
                type="password"
                value={manualPassword}
                onChange={(e) => setManualPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2.5 bg-[#05070c] border border-white/10 focus:border-sky-400 rounded text-white text-sm outline-none transition-colors"
              />
              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-[#06080d] font-semibold text-sm tracking-wide rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </main>

      {/* PIN / password modal for a protected profile */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.form
              onSubmit={handlePasswordSubmit}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm flex flex-col items-center text-center ${isShaking ? 'animate-shake' : ''}`}
            >
              <div className="w-16 h-16 rounded-md overflow-hidden bg-[#0b1220] border-2 border-white/20 mb-4 shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedProfile.avatarUrl} alt={selectedProfile.name} className="w-full h-full object-cover" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-1">Welcome back, {selectedProfile.name}</h2>
              <p className="text-xs text-slate-400 mb-8">
                {DEMO ? 'Enter this profile’s PIN (any 4 digits in demo mode)' : 'Enter your password to unlock this profile'}
              </p>

              <div className="relative w-full mb-6">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={DEMO ? 'password' : 'password'}
                  inputMode={DEMO ? 'numeric' : undefined}
                  maxLength={DEMO ? 4 : undefined}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder={DEMO ? 'PIN' : 'Password'}
                  autoFocus
                  disabled={loading}
                  className="w-full pl-9 pr-4 py-3 bg-[#0b1220] border border-white/10 focus:border-sky-400 rounded-lg text-white text-sm outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-xs mb-6">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-6">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unlocking cinema vault…</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-white hover:bg-sky-200 text-[#06080d] font-semibold text-sm tracking-wide rounded-lg transition-colors disabled:opacity-50"
              >
                Unlock
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedProfile(null);
                  setError(null);
                }}
                disabled={loading}
                className="text-slate-400 hover:text-white text-xs sm:text-sm tracking-wider uppercase font-medium mt-4 transition-colors"
              >
                Cancel
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 w-full py-6 text-center text-xs text-slate-600">
        DinuStream Cinema • {DEMO ? 'Demo mode' : 'Powered by your private Jellyfin library'}
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#06080d] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
