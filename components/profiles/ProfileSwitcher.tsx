'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { PROFILES } from '@/lib/constants';
import { UserProfileId } from '@/types/cinema';
import { Avatar } from '@/components/ui/Avatar';
import { Check, ChevronDown, Sliders, ShieldCheck } from 'lucide-react';
import { ProfileSettingsModal } from './ProfileSettingsModal';

export const ProfileSwitcher: React.FC = () => {
  const { profile, profileId, switchProfile, companionProfile } = useActiveProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSelect = (id: UserProfileId) => {
    switchProfile(id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#0d1420]/80 hover:bg-[#141e30] border border-slate-400/[0.12] transition-colors cinema-focus"
        aria-label="Switch Profile"
        id="profile-switcher-btn"
      >
        <Avatar profile={profile} size="sm" />

        <div className="text-left hidden sm:block">
          <p className="text-xs font-medium text-slate-200 leading-none">{profile.name}</p>
        </div>

        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Dismiss */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0a0f18]/95 backdrop-blur-xl border border-slate-400/[0.14] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,0.85)] z-50 overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">
                  Private Screening Room
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  Exclusive access for Dinu & Kanmani
                </p>
              </div>

              {(Object.keys(PROFILES) as UserProfileId[]).map((key) => {
                const item = PROFILES[key];
                const isActive = profileId === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleSelect(key)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-white/[0.08] text-white'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar profile={item} size="sm" />
                      <div>
                        <span className="text-xs font-medium block text-slate-100">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-light">
                          {item.favoriteGenre}
                        </span>
                      </div>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-slate-200" />}
                  </button>
                );
              })}

              <div className="mt-1 pt-2 border-t border-white/[0.06] px-1 space-y-1">
                {profile.id === 'dinu' && (
                  <Link
                    href="/admin"
                    onClick={() => setIsOpen(false)}
                    id="profile-admin-btn"
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left text-sky-300 hover:bg-sky-500/10 hover:text-white transition-all text-xs font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      Operations & Admin
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                      Terminal
                    </span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  id="profile-settings-btn"
                  className="w-full flex items-center justify-between p-2 rounded-lg text-left text-slate-300 hover:bg-white/[0.06] hover:text-white transition-all text-xs font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-sky-400" />
                    Profile & Cinema Settings
                  </span>
                </button>

                <div className="px-2 py-1 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Companion:</span>
                  <span className="text-slate-200 font-medium">{companionProfile.name} (Online)</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Comprehensive Profile & Cinema Settings Modal */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
