'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile } from '@/types/cinema';
import { Avatar } from '@/components/ui/Avatar';
import {
  Lock,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  Check,
} from 'lucide-react';
import { profileService } from '@/lib/services/profileService';
import { AvatarPickerModal } from '@/components/profile/AvatarPickerModal';
import { PREMIUM_AVATARS, CharacterAvatar } from '@/lib/constants/avatars';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [profiles, setProfiles] = useState<UserProfile[]>(() => profileService.getAllProfiles());
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  // 4-Digit PIN State
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const pinInputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Add Profile Modal State
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePin, setNewProfilePin] = useState(false);
  const [newAvatar, setNewAvatar] = useState<CharacterAvatar>(PREMIUM_AVATARS[0]);

  // Edit Profile Modal State (When in Manage Profiles mode)
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState(false);
  const [editAvatar, setEditAvatar] = useState<CharacterAvatar | null>(null);

  // Avatar Picker Modal State
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const [avatarPickerTarget, setAvatarPickerTarget] = useState<'create' | 'edit'>('create');

  // Subscribe to profile changes
  useEffect(() => {
    const unsub = profileService.subscribe(() => {
      setProfiles(profileService.getAllProfiles());
    });
    return unsub;
  }, []);

  // Auto-focus first PIN box when opening PIN overlay
  useEffect(() => {
    if (selectedProfile?.pinProtected) {
      setPinDigits(['', '', '', '']);
      setError(null);
      const timer = setTimeout(() => {
        pinInputRefs[0].current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
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
        throw new Error(data.error || 'Incorrect PIN');
      }

      // Switch profile in local service
      profileService.switchProfile(profileId);

      // Redirect
      router.push(redirectUrl);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPinDigits(['', '', '', '']);
      pinInputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (profile: UserProfile) => {
    if (isManaging) {
      // Open Edit Profile modal
      setEditingProfile(profile);
      setEditName(profile.name);
      setEditPin(Boolean(profile.pinProtected));
      const matched =
        PREMIUM_AVATARS.find(
          (a) => a.avatarUrl === profile.avatarUrl || a.svgDataUri === profile.avatarUrl
        ) || PREMIUM_AVATARS[0];
      setEditAvatar(matched);
      return;
    }

    if (profile.pinProtected) {
      setSelectedProfile(profile);
    } else {
      performLogin(profile.id);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const digit = val.slice(-1);
    if (!/^\d*$/.test(digit)) return;

    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);
    setError(null);

    if (digit && index < 3) {
      pinInputRefs[index + 1].current?.focus();
    }

    // Auto submit on last digit
    if (digit && index === 3) {
      const fullPin = next.join('');
      if (selectedProfile) {
        performLogin(selectedProfile.id, fullPin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs[index - 1].current?.focus();
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    const created = profileService.createCustomProfile(
      newProfileName.trim(),
      newAvatar.avatarUrl,
      newAvatar.accentColor,
      newProfilePin,
      newAvatar.glowColor
    );

    setIsAddProfileOpen(false);
    setNewProfileName('');
    setNewProfilePin(false);

    if (created && !created.pinProtected) {
      performLogin(created.id, '', created.name);
    }
  };

  const handleSaveEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editName.trim()) return;

    profileService.updateProfileCustom(editingProfile.id, {
      name: editName.trim(),
      avatarUrl: editAvatar?.avatarUrl || editingProfile.avatarUrl,
      accentColor: editAvatar?.accentColor || editingProfile.accentColor,
      glowColor: editAvatar?.glowColor || editingProfile.glowColor,
      pinProtected: editPin,
    });

    setEditingProfile(null);
  };

  const handleDeleteProfile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('Are you sure you want to remove this profile?')) {
      profileService.deleteProfile(id);
      if (editingProfile?.id === id) {
        setEditingProfile(null);
      }
    }
  };

  const openAvatarPickerFor = (target: 'create' | 'edit') => {
    setAvatarPickerTarget(target);
    setIsAvatarPickerOpen(true);
  };

  const handleAvatarSelected = (avatar: CharacterAvatar) => {
    if (avatarPickerTarget === 'create') {
      setNewAvatar(avatar);
    } else {
      setEditAvatar(avatar);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#141414] text-white flex flex-col justify-between select-none overflow-x-hidden">
      {/* Background Gradient & Ambient Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/60 via-[#141414] to-[#0c0c0c] pointer-events-none" />

      {/* Top Header / Logo */}
      <header className="relative z-10 w-full px-6 sm:px-12 py-6 sm:py-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#E50914] font-black text-2xl sm:text-3xl tracking-wider">
            DINUSTREAM
          </span>
          <span className="hidden sm:inline-block text-[11px] font-semibold tracking-widest uppercase px-2 py-0.5 rounded bg-white/10 text-neutral-300">
            Cinema
          </span>
        </div>
      </header>

      {/* Main Who's Watching Center Stage */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-6xl mx-auto w-full">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-5xl font-medium tracking-tight text-white mb-8 sm:mb-12 text-center"
        >
          {isManaging ? 'Manage Profiles:' : "Who's watching?"}
        </motion.h1>

        {/* Profiles Row */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 max-w-4xl">
          {profiles.map((p) => {
            const isCustom = p.id !== 'dinu' && p.id !== 'kanmani' && p.id !== 'guest';

            return (
              <div
                key={p.id}
                onClick={() => handleProfileClick(p)}
                className="group flex flex-col items-center cursor-pointer"
              >
                {/* Square Avatar Tile with character glow on hover */}
                <div
                  className="relative w-24 h-24 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-md overflow-hidden bg-neutral-800 border-2 border-transparent group-hover:border-white transition-all duration-200 group-hover:scale-105 shadow-2xl flex items-center justify-center"
                  style={{
                    borderColor: isManaging ? 'rgba(255,255,255,0.4)' : undefined,
                  }}
                >
                  <Avatar profile={p} size="xl" className="w-full h-full rounded-none" />

                  {/* Lock Indicator */}
                  {p.pinProtected && !isManaging && (
                    <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/70 backdrop-blur-sm text-neutral-300">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Manage Profiles Overlay */}
                  {isManaging && (
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center transition-all group-hover:bg-black/45">
                      <div className="p-2.5 rounded-full border border-white/70 bg-black/50 text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Pencil className="w-5 h-5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile Name */}
                <span className="text-neutral-400 group-hover:text-white transition-colors duration-200 text-sm sm:text-base md:text-lg text-center mt-3 font-normal truncate max-w-[100px] sm:max-w-[140px]">
                  {p.name}
                </span>
              </div>
            );
          })}

          {/* Add Profile Tile */}
          {!isManaging && (
            <div
              onClick={() => setIsAddProfileOpen(true)}
              className="group flex flex-col items-center cursor-pointer"
            >
              <div className="w-24 h-24 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-md border-2 border-neutral-700 hover:border-white bg-transparent hover:bg-white/5 transition-all duration-200 group-hover:scale-105 flex items-center justify-center text-neutral-500 hover:text-white shadow-xl">
                <Plus className="w-10 h-10 sm:w-14 sm:h-14 stroke-[1.5]" />
              </div>
              <span className="text-neutral-400 group-hover:text-white transition-colors duration-200 text-sm sm:text-base md:text-lg text-center mt-3 font-normal">
                Add Profile
              </span>
            </div>
          )}
        </div>

        {/* Manage Profiles Button */}
        <div className="mt-12 sm:mt-16">
          <button
            onClick={() => setIsManaging(!isManaging)}
            className={`px-6 sm:px-8 py-2 text-xs sm:text-sm tracking-widest uppercase transition-all duration-200 font-medium ${
              isManaging
                ? 'bg-white text-black hover:bg-[#E50914] hover:text-white'
                : 'border border-neutral-600 text-neutral-400 hover:border-white hover:text-white'
            }`}
          >
            {isManaging ? 'Done' : 'Manage Profiles'}
          </button>
        </div>
      </main>

      {/* Netflix 4-Digit PIN Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm flex flex-col items-center text-center ${
                isShaking ? 'animate-shake' : ''
              }`}
            >
              {/* Profile Avatar Thumbnail */}
              <div className="w-16 h-16 rounded-md overflow-hidden bg-neutral-800 border-2 border-white/20 mb-4 shadow-xl">
                <Avatar profile={selectedProfile} size="lg" className="w-full h-full rounded-none" />
              </div>

              <span className="text-neutral-400 text-xs sm:text-sm uppercase tracking-widest font-semibold mb-1">
                Profile Lock is on
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Enter your PIN to access {selectedProfile.name}
              </h2>
              <p className="text-xs text-neutral-400 mb-8">
                Enter the 4-digit PIN for this private profile
              </p>

              {/* 4 PIN Digit Inputs */}
              <div className="flex items-center justify-center gap-3 sm:gap-4 mb-6">
                {pinDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={pinInputRefs[idx]}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    disabled={loading}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-neutral-900 border border-neutral-700 focus:border-white rounded-md text-white outline-none transition-colors"
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 text-rose-500 text-xs mb-6">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2 text-neutral-400 text-xs mb-6">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Unlocking cinema vault...</span>
                </div>
              )}

              {/* Cancel Button */}
              <button
                onClick={() => setSelectedProfile(null)}
                disabled={loading}
                className="text-neutral-400 hover:text-white text-xs sm:text-sm tracking-wider uppercase font-medium mt-2 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Profile Modal */}
      <AnimatePresence>
        {isAddProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181818] border border-neutral-800 rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Add Profile</h2>
                <button
                  onClick={() => setIsAddProfileOpen(false)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-400 mb-6">
                Choose a cinema character and name for your personalized profile.
              </p>

              <form onSubmit={handleCreateProfile} className="space-y-6">
                {/* Avatar Preview & Character Picker Trigger */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
                  <div
                    onClick={() => openAvatarPickerFor('create')}
                    className="relative group cursor-pointer w-18 h-18 sm:w-20 sm:h-20 rounded-md overflow-hidden bg-neutral-800 border-2 transition-transform hover:scale-105 shadow-xl flex-shrink-0"
                    style={{
                      borderColor: newAvatar.accentColor,
                      boxShadow: `0 0 15px ${newAvatar.glowColor}`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={newAvatar.avatarUrl || newAvatar.svgDataUri}
                      alt={newAvatar.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Pencil className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                      {newAvatar.franchise}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1 truncate">
                      {newAvatar.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => openAvatarPickerFor('create')}
                      className="mt-2 text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Choose Character Avatar
                    </button>
                  </div>
                </div>

                {/* Profile Name Input */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="Enter name (e.g., Alex, Dinu, Guest)"
                    autoFocus
                    required
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-white rounded text-white text-sm outline-none transition-colors"
                  />
                </div>

                {/* PIN Lock Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                  <div>
                    <span className="text-xs text-neutral-200 block font-medium">Require 4-digit PIN</span>
                    <span className="text-[11px] text-neutral-500">Lock this profile with PIN code 1234</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newProfilePin}
                    onChange={(e) => setNewProfilePin(e.target.checked)}
                    className="w-4 h-4 accent-[#E50914] rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-white text-black hover:bg-[#E50914] hover:text-white font-semibold text-xs sm:text-sm tracking-wider uppercase transition-colors"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddProfileOpen(false)}
                    className="flex-1 py-2.5 border border-neutral-600 text-neutral-400 hover:border-white hover:text-white font-medium text-xs sm:text-sm tracking-wider uppercase transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal (Hotstar Character Selection in Manage Profiles Mode) */}
      <AnimatePresence>
        {editingProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181818] border border-neutral-800 rounded-xl p-6 sm:p-8 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Edit Profile</h2>
                <button
                  onClick={() => setEditingProfile(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditProfile} className="space-y-6">
                {/* Avatar Preview & Character Picker Trigger */}
                <div className="flex items-center gap-4 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
                  <div
                    onClick={() => openAvatarPickerFor('edit')}
                    className="relative group cursor-pointer w-20 h-20 rounded-md overflow-hidden bg-neutral-800 border-2 transition-transform hover:scale-105 shadow-xl flex-shrink-0"
                    style={{
                      borderColor: editAvatar?.accentColor || editingProfile.accentColor,
                      boxShadow: `0 0 15px ${editAvatar?.glowColor || editingProfile.glowColor}`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={editAvatar?.avatarUrl || editingProfile.avatarUrl}
                      alt={editName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Pencil className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-neutral-300">
                      {editAvatar?.franchise || 'Cinema Character'}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1 truncate">
                      {editAvatar?.name || editName}
                    </h4>
                    <button
                      type="button"
                      onClick={() => openAvatarPickerFor('edit')}
                      className="mt-2 text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Change Character Avatar
                    </button>
                  </div>
                </div>

                {/* Profile Name Input */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 focus:border-white rounded text-white text-sm outline-none transition-colors"
                  />
                </div>

                {/* PIN Lock Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                  <div>
                    <span className="text-xs text-neutral-200 block font-medium">Profile PIN Lock</span>
                    <span className="text-[11px] text-neutral-500">Require PIN code to open</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editPin}
                    onChange={(e) => setEditPin(e.target.checked)}
                    className="w-4 h-4 accent-[#E50914] rounded cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-white text-black hover:bg-[#E50914] hover:text-white font-semibold text-xs sm:text-sm tracking-wider uppercase transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    className="flex-1 py-2.5 border border-neutral-600 text-neutral-400 hover:border-white hover:text-white font-medium text-xs sm:text-sm tracking-wider uppercase transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Delete Profile (Only for custom non-core profiles) */}
                {editingProfile.id !== 'dinu' && editingProfile.id !== 'kanmani' && editingProfile.id !== 'guest' && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(editingProfile.id)}
                      className="text-xs text-rose-500 hover:text-rose-400 flex items-center justify-center gap-1 mx-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete This Profile
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disney+ Hotstar Style Avatar Picker Modal */}
      <AvatarPickerModal
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        currentAvatarUrl={
          avatarPickerTarget === 'create'
            ? newAvatar.avatarUrl
            : editAvatar?.avatarUrl || editingProfile?.avatarUrl
        }
        onSelectAvatar={handleAvatarSelected}
      />

      {/* Footer */}
      <footer className="relative z-10 w-full py-6 text-center text-xs text-neutral-600">
        DinuStream Cinema • Netflix Pure Profile Architecture • Hotstar Character Vault
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#141414] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#E50914]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
