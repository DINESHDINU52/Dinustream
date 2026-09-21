'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { profileService } from '@/lib/services/profileService';
import { UserProfile } from '@/types/cinema';
import { Avatar } from '@/components/ui/Avatar';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/Button';
import { Upload, Sparkles, Check, Camera, Save } from 'lucide-react';

const PRESET_AVATARS = [
  {
    id: 'preset-dinu-master',
    name: 'Cinema Master (Cyan)',
    url: '/avatars/dinu.svg',
    category: 'Master',
  },
  {
    id: 'preset-kanmani-royalty',
    name: 'Screen Royalty (Rose)',
    url: '/avatars/kanmani.svg',
    category: 'Royalty',
  },
  {
    id: 'preset-guest-emerald',
    name: 'Cinema Guest (Emerald)',
    url: '/avatars/guest.svg',
    category: 'Guest',
  },
  {
    id: 'preset-imax-gold',
    name: 'IMAX 70mm Gold',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="28" fill="%230b0d14"/><rect x="2" y="2" width="96" height="96" rx="26" stroke="%23f59e0b" stroke-width="2.5" opacity="0.9"/><circle cx="50" cy="40" r="18" fill="%23f59e0b"/><path d="M24 82 C24 64 36 58 50 58 C64 58 76 64 76 82" fill="%23f59e0b" opacity="0.9"/><text x="50" y="46" font-family="-apple-system, sans-serif" font-size="13" font-weight="900" fill="%23050507" text-anchor="middle">IMAX</text></svg>',
    category: 'IMAX',
  },
  {
    id: 'preset-dolby-atmos-violet',
    name: 'Dolby Spatial Violet',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="28" fill="%230c0a17"/><rect x="2" y="2" width="96" height="96" rx="26" stroke="%23a855f7" stroke-width="2.5" opacity="0.9"/><circle cx="50" cy="40" r="18" fill="%23a855f7"/><path d="M24 82 C24 64 36 58 50 58 C64 58 76 64 76 82" fill="%23a855f7" opacity="0.9"/><text x="50" y="46" font-family="-apple-system, sans-serif" font-size="14" font-weight="900" fill="%23050507" text-anchor="middle">ATMOS</text></svg>',
    category: 'Dolby',
  },
  {
    id: 'preset-director-film',
    name: 'Director Velvet',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="28" fill="%23170a0e"/><rect x="2" y="2" width="96" height="96" rx="26" stroke="%23ec4899" stroke-width="2.5" opacity="0.9"/><circle cx="50" cy="40" r="18" fill="%23ec4899"/><path d="M24 82 C24 64 36 58 50 58 C64 58 76 64 76 82" fill="%23ec4899" opacity="0.9"/><text x="50" y="46" font-family="-apple-system, sans-serif" font-size="16" font-weight="900" fill="%23050507" text-anchor="middle">DIR</text></svg>',
    category: 'Cinema',
  },
];

export function AvatarStudio() {
  const [profiles, setProfiles] = useState<UserProfile[]>(() =>
    profileService.getAllProfiles()
  );
  const [targetProfileId, setTargetProfileId] = useState<string>('dinu');
  const [previewUrl, setPreviewUrl] = useState<string>(() => {
    const p = profileService.getAllProfiles().find((p) => p.id === 'dinu');
    return p?.avatarUrl || '/avatars/dinu.svg';
  });
  const [customUrlInput, setCustomUrlInput] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeProfile = profiles.find((p) => p.id === targetProfileId) || profiles[0];

  const handleProfileSwitch = (id: string) => {
    setTargetProfileId(id);
    const p = profiles.find((p) => p.id === id);
    setPreviewUrl(p?.avatarUrl || '/avatars/dinu.svg');
    setSavedSuccess(false);
  };

  // Handle image upload from local file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar file too large. Please select an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPreviewUrl(dataUrl);
        setSavedSuccess(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save selected/uploaded avatar
  const handleSaveAvatar = () => {
    profileService.updateProfileAvatar(targetProfileId, previewUrl);
    setProfiles(profileService.getAllProfiles());
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3500);
  };

  return (
    <GlassPanel variant="elevated" padding="lg" className="border-white/[0.1] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Profile Avatar Studio
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono font-medium text-cyan-300">
              Dinu & Kanmani
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Customize personal cinema avatars with file uploads, direct URLs, or bespoke luxury presets.
          </p>
        </div>

        {/* Profile Selector Pills */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0b101b] border border-white/[0.08]">
          {profiles.slice(0, 3).map((p) => {
            const isSelected = p.id === targetProfileId;
            return (
              <button
                key={p.id}
                onClick={() => handleProfileSwitch(p.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Avatar profile={p} size="sm" />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Preview & Upload Action */}
        <div className="md:col-span-4 flex flex-col items-center p-6 rounded-2xl bg-[#080d16]/90 border border-slate-700/50 text-center space-y-4 shadow-xl">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(56,189,248,0.35)] p-1 bg-[#0b101b]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={activeProfile.name}
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="absolute bottom-1 right-1 p-2 rounded-full bg-cyan-500 text-black shadow-lg">
              <Camera className="w-3.5 h-3.5" />
            </span>
          </div>

          <div>
            <h3 className="font-bold text-white text-base">{activeProfile.name}</h3>
            <p className="text-xs text-cyan-400 font-medium">{activeProfile.title}</p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center text-xs"
            icon={<Upload className="w-3.5 h-3.5 text-cyan-400" />}
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Device Photo
          </Button>

          <Button
            variant="primary"
            size="md"
            className="w-full justify-center text-xs shadow-lg shadow-cyan-500/25"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSaveAvatar}
          >
            Save & Apply Avatar
          </Button>

          <AnimatePresence>
            {savedSuccess && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Avatar Applied to {activeProfile.name}!</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Presets & Custom URL */}
        <div className="md:col-span-8 space-y-5">
          {/* Preset Gallery */}
          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2.5">
              Select Preset Avatar
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = previewUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setPreviewUrl(preset.url);
                      setSavedSuccess(false);
                    }}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all text-left ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] text-white'
                        : 'bg-[#0a0f18] border-white/[0.08] hover:border-white/[0.18] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{preset.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{preset.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct URL Input */}
          <div className="pt-2">
            <label className="block text-xs font-mono uppercase text-slate-400 tracking-wider mb-2">
              Or Paste Direct Image URL
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b101b] border border-white/[0.1] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (customUrlInput.trim()) {
                    setPreviewUrl(customUrlInput.trim());
                    setSavedSuccess(false);
                  }
                }}
              >
                Apply URL
              </Button>
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
