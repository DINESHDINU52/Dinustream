'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { PLATFORM_NAME } from '@/lib/constants';
import { UserProfile } from '@/types/cinema';
import { Avatar } from '@/components/ui/Avatar';
import {
  Lock,
  Sparkles,
  Film,
  ArrowRight,
  ShieldAlert,
  KeyRound,
  UserPlus,
  X,
  UserCheck,
} from 'lucide-react';
import { profileService } from '@/lib/services/profileService';
import {
  presenceService,
  isPresenceOnline,
  ProfilePresence,
} from '@/lib/services/presenceService';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  /*
    Seeded from the service synchronously via a lazy initialiser rather than
    assigned inside an effect. Populating it in the effect body meant the first
    paint always rendered an empty profile grid and then immediately re-rendered
    (a cascading render React now warns about), which showed up as a visible
    flash of the "Who is watching?" card with no avatars in it.
  */
  const [profiles, setProfiles] = useState<UserProfile[]>(() => profileService.getAllProfiles());
  const [presenceMap, setPresenceMap] = useState<Record<string, ProfilePresence>>({});
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // Add Guest Modal state
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');

  const pinInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to profile + presence updates
  useEffect(() => {
    const unsubProfile = profileService.subscribe(() => {
      setProfiles(profileService.getAllProfiles());
    });

    const unsubPresence = presenceService.subscribe((presences) => {
      setPresenceMap(presences);
    });

    return () => {
      unsubProfile();
      unsubPresence();
    };
  }, []);

  // Auto-focus the PIN field once the card has animated in.
  useEffect(() => {
    if (!selectedProfile?.pinProtected) return;
    const timer = setTimeout(() => pinInputRef.current?.focus(), 150);
    // Cleared on unmount/re-select so a stale timer cannot steal focus back.
    return () => clearTimeout(timer);
  }, [selectedProfile]);

  const performLogin = async (profileId: string, enteredPin: string = '', guestName?: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, pin: enteredPin, guestName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Sync active profile locally
      profileService.switchProfile(profileId);

      // Successfully authenticated! Redirect
      router.push(redirectUrl);
      router.refresh();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      setLoading(false);
      setPin('');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      pinInputRef.current?.focus();
    }
  };

  const handleProfileClick = (p: UserProfile) => {
    setError(null);
    setPin('');

    if (p.pinProtected) {
      setSelectedProfile(p);
    } else {
      // Direct one-click login for guest profiles
      setSelectedProfile(p);
      performLogin(p.id, '');
    }
  };

  // Instant fast PIN entry handler: auto-submit upon 4 digits
  const handlePinChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setPin(clean);
    setError(null);

    if (clean.length === 4 && selectedProfile) {
      // Auto-submit instantly!
      performLogin(selectedProfile.id, clean);
    }
  };

  const handleCreateGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const guest = profileService.addGuestProfile(newGuestName);
    setIsAddGuestOpen(false);
    setNewGuestName('');
    // Direct login as newly created guest
    setSelectedProfile(guest);
    performLogin(guest.id, '', guest.name);
  };

  /*
    Evaluated against the subscribed snapshot rather than the service singleton.
    `presenceMap` is what actually triggers this component to re-render, so
    reading it here is what keeps the online dots truthful — querying the
    singleton instead left the state write as a dead re-render trigger.
  */
  const isOnline = (profileId: string) => isPresenceOnline(presenceMap[profileId]);

  const getLastSeen = (profileId: string) => {
    return presenceService.getLastSeenText(profileId);
  };

  return (
    <div className="relative min-h-screen-dynamic w-full bg-[#05070c] text-white flex flex-col justify-center items-center px-4 py-10 sm:py-16 pt-safe pb-safe overflow-hidden selection:bg-cyan-500/30">
      {/*
        Ambient glows. Sized relative to the viewport: at a fixed 700×500 with a
        140px blur these bled well past a phone screen, and because the wrapper
        is `overflow-hidden` the right-hand pair simply produced a lopsided wash
        instead of a symmetric bloom.
      */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] max-w-[700px] h-[60vh] max-h-[500px] bg-gradient-to-tr from-cyan-600/10 via-rose-600/15 to-emerald-600/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 -right-20 sm:right-10 w-[70vw] max-w-[400px] h-[70vw] max-h-[400px] bg-cyan-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />
      <div className="absolute top-10 -left-20 sm:left-10 w-[70vw] max-w-[400px] h-[70vw] max-h-[400px] bg-emerald-500/10 rounded-full blur-[100px] sm:blur-[120px] pointer-events-none" />

      {/* Brand Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10 mb-8 sm:mb-12 max-w-xl"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-md mb-4 text-xs font-medium tracking-wide text-cyan-300">
          <Film className="w-3.5 h-3.5 text-cyan-400" />
          <span>Private Screening Room</span>
          <span className="w-1 h-1 rounded-full bg-cyan-400" />
          <span className="text-slate-300">Dinu, Kanmani & Cinema Guests</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          {PLATFORM_NAME}
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-md mx-auto">
          Dolby Atmos • 4K HDR • Synchronized Real-Time Cinema
        </p>
      </motion.div>

      {/* Main Container */}
      <div className="w-full max-w-2xl z-10">
        <AnimatePresence mode="wait">
          {!selectedProfile || !selectedProfile.pinProtected ? (
            /* Profile Selection Grid */
            <motion.div
              key="profiles-list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="bg-[#0b101b]/80 border border-slate-700/50 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] text-center"
            >
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight mb-1">
                Who is watching?
              </h2>
              <p className="text-xs text-slate-400 mb-6 sm:mb-8">
                Select your private cinema profile to enter
              </p>

              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5 text-left">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Profiles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5">
                {profiles.map((p) => {
                  const online = isOnline(p.id);
                  const lastSeen = getLastSeen(p.id);
                  const isDinu = p.id === 'dinu';
                  const isKanmani = p.id === 'kanmani';

                  let borderClass = 'hover:border-emerald-500/50 hover:shadow-[0_15px_30px_rgba(16,185,129,0.15)]';
                  let badgeBg = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                  let titleColor = 'group-hover:text-emerald-400';
                  let icon = <UserCheck className="w-3.5 h-3.5" />;
                  let iconBg = 'text-emerald-400';

                  if (isDinu) {
                    borderClass = 'hover:border-cyan-500/50 hover:shadow-[0_15px_30px_rgba(56,189,248,0.15)]';
                    badgeBg = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20';
                    titleColor = 'group-hover:text-cyan-400';
                    icon = <Lock className="w-3.5 h-3.5" />;
                    iconBg = 'text-cyan-400';
                  } else if (isKanmani) {
                    borderClass = 'hover:border-rose-500/50 hover:shadow-[0_15px_30px_rgba(244,63,94,0.15)]';
                    badgeBg = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
                    titleColor = 'group-hover:text-rose-400';
                    icon = <Sparkles className="w-3.5 h-3.5" />;
                    iconBg = 'text-rose-400';
                  }

                  return (
                    <button
                      key={p.id}
                      onClick={() => handleProfileClick(p)}
                      disabled={loading}
                      className={`group relative flex flex-col items-center p-5 sm:p-6 rounded-2xl bg-[#121927]/60 hover:bg-[#162134]/90 border border-slate-700/40 ${borderClass} transition-all duration-300 transform hover:-translate-y-1 text-center focus:outline-none focus:ring-2 focus:ring-cyan-500/40`}
                    >
                      {/* Avatar with lock/badge */}
                      <div className="relative mb-3.5">
                        <Avatar profile={p} size="xl" isOnline={online} />
                        <span className={`absolute -bottom-1 -right-1 p-1 bg-[#090d16] rounded-full border border-slate-700/50 ${iconBg}`}>
                          {icon}
                        </span>
                      </div>

                      {/* Name & Title */}
                      <span className={`text-base font-bold text-slate-100 ${titleColor} transition-colors`}>
                        {p.name}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {p.title || (p.isGuest ? 'Cinema Guest' : 'VIP Profile')}
                      </span>

                      {/* Online/Offline & Status Badge */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="text-[10px] text-slate-400 font-mono">
                          {lastSeen}
                        </span>
                      </div>

                      <span className={`mt-2 px-2 py-0.5 text-[10px] rounded-full border font-medium ${badgeBg}`}>
                        {p.pinProtected ? 'PIN Protected' : '1-Click Entry'}
                      </span>
                    </button>
                  );
                })}

                {/* + Add Guest Account Card */}
                <button
                  onClick={() => setIsAddGuestOpen(true)}
                  disabled={loading}
                  className="group relative flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl bg-[#121927]/30 hover:bg-[#162134]/70 border border-dashed border-slate-700 hover:border-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1 text-center focus:outline-none"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/[0.04] group-hover:bg-emerald-500/10 border border-white/[0.08] group-hover:border-emerald-500/30 text-slate-400 group-hover:text-emerald-400 transition-all mb-3.5">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                    Add Guest
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Multiple guest profiles
                  </span>
                </button>
              </div>

              {loading && (
                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  <span>Entering private cinema...</span>
                </div>
              )}
            </motion.div>
          ) : (
            /* Fast PIN Verification View for PIN Protected Profiles */
            <motion.div
              key="enter-pin"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className={`bg-[#0b101b]/90 border border-slate-700/50 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-w-md mx-auto ${isShaking ? 'animate-shake' : ''}`}
            >
              {/* Header with profile info */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <Avatar profile={selectedProfile} size="md" />
                  <div className="text-left">
                    <h3 className="font-bold text-slate-100 text-base">{selectedProfile.name}</h3>
                    <p className={`text-xs ${selectedProfile.id === 'dinu' ? 'text-cyan-400' : 'text-rose-400'}`}>
                      {selectedProfile.id === 'dinu' ? 'Cinema Master Authorization' : 'Private Screening PIN'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProfile(null);
                    setError(null);
                    setPin('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]"
                >
                  Switch Profile
                </button>
              </div>

              <div className="text-center space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Enter 4-Digit PIN
                  </label>

                  {/* Aesthetic 4-Digit Box Container */}
                  <div
                    onClick={() => pinInputRef.current?.focus()}
                    className="flex justify-center items-center gap-3 sm:gap-4 cursor-text my-2"
                  >
                    {[0, 1, 2, 3].map((index) => {
                      const char = pin[index];
                      const isFilled = Boolean(char);
                      const isDinu = selectedProfile.id === 'dinu';
                      const activeBorder = isDinu
                        ? 'border-cyan-500 shadow-[0_0_15px_rgba(56,189,248,0.3)] text-cyan-300'
                        : 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] text-rose-300';

                      return (
                        <div
                          key={index}
                          className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex items-center justify-center text-2xl font-bold bg-[#121927] border transition-all duration-200 ${
                            isFilled ? activeBorder : 'border-slate-700/80 text-slate-600'
                          }`}
                        >
                          {isFilled ? '•' : ''}
                        </div>
                      );
                    })}
                  </div>

                  {/*
                    The real input behind the four decorative PIN boxes.

                    It was styled `absolute -left-9999px`, which is not a valid
                    Tailwind class (arbitrary values need brackets:
                    `-left-[9999px]`). With no offset applied the input stayed at
                    its static position directly on top of the boxes, and
                    `pointer-events-none` then blocked the tap-to-focus that
                    mobile keyboards depend on — so on a phone the PIN screen
                    could not be filled in at all.

                    `.sr-only-focusable` clips it out of view while keeping it
                    focusable and able to raise the numeric keypad.
                  */}
                  <input
                    ref={pinInputRef}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    aria-label="4-digit PIN"
                    className="sr-only-focusable"
                  />

                  <p className="text-[11px] text-slate-500 mt-3 flex items-center justify-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                    <span>Auto-authenticates immediately upon entering 4 digits</span>
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {loading && (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.04] text-xs text-slate-300">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating instantly...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Guest Modal */}
      <AnimatePresence>
        {isAddGuestOpen && (
          /* `overflow-y-auto` + `min-h-full` so the card stays reachable when the
             on-screen keyboard shrinks the viewport on a phone. */
          <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAddGuestOpen(false)}
            />

            <div className="relative flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="dialog"
              aria-modal="true"
              aria-label="Create guest profile"
              className="relative w-full max-w-md bg-[#0d1420] border border-slate-700/60 rounded-2xl p-5 sm:p-6 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white text-base">Create Guest Profile</h3>
                </div>
                <button
                  onClick={() => setIsAddGuestOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGuest} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Guest Profile Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Guest 2, Living Room TV, Alex"
                    value={newGuestName}
                    onChange={(e) => setNewGuestName(e.target.value)}
                    autoFocus
                    className="w-full bg-[#141e30] border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Guest profiles have full 1-click access without requiring a PIN.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddGuestOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/[0.06]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    <span>Create &amp; Enter</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 text-xs text-slate-500 text-center z-10"
      >
        Private Cloud Architecture • Zero Telemetry • Dolby Atmos Direct Play
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
