'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { Avatar } from '@/components/ui/Avatar';
import { ChevronDown, Sliders, ShieldCheck, LogOut } from 'lucide-react';
import { ProfileSettingsModal } from './ProfileSettingsModal';

export const ProfileSwitcher: React.FC = () => {
  const { profile, logout, isLoggingOut, isCurrentOnline } = useActiveProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="relative">
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#0d1420]/80 hover:bg-[#141e30] border border-slate-400/[0.12] transition-colors cinema-focus"
        aria-label="Profile Menu"
        id="profile-switcher-btn"
      >
        <Avatar profile={profile} size="sm" isOnline={isCurrentOnline} />

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
              className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0a0f18]/95 backdrop-blur-2xl border border-slate-700/50 p-3 shadow-[0_16px_48px_rgba(0,0,0,0.85)] z-50 overflow-hidden"
            >
              {/* Active Profile Info Card */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-2.5">
                <Avatar profile={profile} size="md" isOnline={isCurrentOnline} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{profile.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {profile.title || (profile.isGuest ? 'Cinema Guest' : 'VIP Member')}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] text-emerald-400 font-medium">Session Active</span>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-1">
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
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">
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
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    Profile & Audio Settings
                  </span>
                </button>
              </div>

              {/* Enforced Logout & Profile Switch Notice */}
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <p className="text-[10px] text-slate-500 px-1 mb-2 leading-relaxed">
                  Profile switching is secured on the login screen.
                </p>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    logout();
                  }}
                  disabled={isLoggingOut}
                  id="profile-logout-btn"
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <div className="w-3.5 h-3.5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                  ) : (
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>Switch Profile (Log Out)</span>
                </button>
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
