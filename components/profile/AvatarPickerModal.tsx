'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PREMIUM_AVATARS,
  AVATAR_CATEGORIES,
  CharacterAvatar,
  AvatarCategory,
} from '@/lib/constants/avatars';
import { X, Check, Sparkles, Search, Film } from 'lucide-react';

export interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
  onSelectAvatar: (avatar: CharacterAvatar) => void;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  isOpen,
  onClose,
  currentAvatarUrl,
  onSelectAvatar,
}) => {
  // Find initial selected avatar or default to Iron Man
  const initialAvatar = useMemo(() => {
    if (!currentAvatarUrl) return PREMIUM_AVATARS[0];
    const found = PREMIUM_AVATARS.find(
      (a) => a.avatarUrl === currentAvatarUrl || a.svgDataUri === currentAvatarUrl
    );
    return found || PREMIUM_AVATARS[0];
  }, [currentAvatarUrl]);

  const [selectedAvatar, setSelectedAvatar] = useState<CharacterAvatar>(initialAvatar);
  const [hoveredAvatar, setHoveredAvatar] = useState<CharacterAvatar | null>(null);
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Active spotlight is hovered if hovering, otherwise currently selected
  const spotlight = hoveredAvatar || selectedAvatar;

  // Filter avatars based on category & search query
  const filteredAvatars = useMemo(() => {
    return PREMIUM_AVATARS.filter((avatar) => {
      const matchesCategory =
        activeCategory === 'All' || avatar.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        avatar.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
        avatar.franchise.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleConfirm = () => {
    onSelectAvatar(selectedAvatar);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-[#11141c]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Subtle Ambient Radial Lighting */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 rounded-full blur-[100px] pointer-events-none transition-all duration-500 opacity-30"
            style={{ backgroundColor: spotlight.accentColor }}
          />

          {/* Modal Header */}
          <div className="relative z-10 px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm"
                style={{
                  backgroundColor: `${spotlight.accentColor}20`,
                  borderColor: `${spotlight.accentColor}60`,
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: spotlight.accentColor }} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-wide text-white flex items-center gap-2 uppercase">
                  Choose Cinema Avatar
                  <span className="text-[10px] tracking-widest font-semibold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
                    Hotstar Exclusive
                  </span>
                </h2>
                <p className="text-xs text-neutral-400">
                  Select an iconic cinema legend to personalize your streaming identity
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Featured Hero Spotlight Banner (Disney+ Hotstar style) */}
          <div className="relative z-10 mx-6 mt-4 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-neutral-900/90 via-neutral-900/70 to-neutral-900/40 border border-white/10 flex items-center gap-4 sm:gap-6 shadow-inner overflow-hidden">
            {/* Character Glowing Headshot */}
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 shadow-2xl transition-all duration-300"
                style={{
                  borderColor: spotlight.accentColor,
                  boxShadow: `0 0 25px ${spotlight.glowColor}`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={spotlight.avatarUrl || spotlight.svgDataUri}
                  alt={spotlight.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span
                className="absolute -bottom-1 -right-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border shadow-md text-white"
                style={{
                  backgroundColor: spotlight.accentColor,
                  borderColor: 'rgba(255,255,255,0.4)',
                }}
              >
                {spotlight.category}
              </span>
            </div>

            {/* Character Lore Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 text-neutral-300 flex items-center gap-1">
                  <Film className="w-3 h-3 text-neutral-400" />
                  {spotlight.franchise}
                </span>
                <span className="text-xs text-neutral-400">• {spotlight.tagline}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate">
                {spotlight.name}
              </h3>

              <p className="text-xs sm:text-sm text-neutral-300 italic font-serif mt-1 truncate">
                &ldquo;{spotlight.quote}&rdquo;
              </p>
            </div>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="relative z-10 px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {AVATAR_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                const count =
                  cat === 'All'
                    ? PREMIUM_AVATARS.length
                    : PREMIUM_AVATARS.filter((a) => a.category === cat).length;

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-black shadow-md shadow-white/10 font-bold'
                        : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-neutral-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[200px] sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search character..."
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-900/80 border border-white/10 focus:border-white/40 rounded-full text-white text-xs outline-none transition-colors placeholder:text-neutral-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Avatar Cards Grid */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 py-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-5 scrollbar-thin scrollbar-thumb-white/10">
            {filteredAvatars.map((char) => {
              const isSelected = selectedAvatar.id === char.id;

              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedAvatar(char)}
                  onMouseEnter={() => setHoveredAvatar(char)}
                  onMouseLeave={() => setHoveredAvatar(null)}
                  className="group flex flex-col items-center cursor-pointer p-2 rounded-xl transition-all duration-200 hover:bg-white/[0.04]"
                >
                  {/* Circular Avatar Container */}
                  <div className="relative">
                    <div
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden transition-all duration-200 flex items-center justify-center shadow-lg ${
                        isSelected
                          ? 'border-[3px] scale-105'
                          : 'border-2 border-transparent group-hover:border-white/60 group-hover:scale-105'
                      }`}
                      style={{
                        borderColor: isSelected ? char.accentColor : undefined,
                        boxShadow: isSelected
                          ? `0 0 20px ${char.glowColor}`
                          : undefined,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={char.avatarUrl || char.svgDataUri}
                        alt={char.name}
                        className="w-full h-full object-cover rounded-full select-none"
                      />
                    </div>

                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md text-white"
                        style={{ backgroundColor: char.accentColor }}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </motion.div>
                    )}
                  </div>

                  {/* Character Name */}
                  <span
                    className={`mt-2.5 text-xs text-center font-medium transition-colors line-clamp-1 max-w-[90px] ${
                      isSelected ? 'text-white font-bold' : 'text-neutral-400 group-hover:text-white'
                    }`}
                  >
                    {char.name}
                  </span>
                </div>
              );
            })}

            {filteredAvatars.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-neutral-400">
                <Search className="w-8 h-8 text-neutral-600 mb-2" />
                <p className="text-sm font-medium">No characters found for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-xs text-neutral-500 mt-1">Try another keyword or category.</p>
              </div>
            )}
          </div>

          {/* Modal Footer / Action Bar */}
          <div className="relative z-10 px-6 py-4 bg-neutral-900/90 border-t border-white/10 flex items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <span className="text-xs text-neutral-400">Selected:</span>
              <span
                className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border text-white"
                style={{
                  backgroundColor: `${selectedAvatar.accentColor}25`,
                  borderColor: selectedAvatar.accentColor,
                }}
              >
                {selectedAvatar.name}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold tracking-wider uppercase text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 sm:flex-initial px-7 py-2.5 rounded-lg text-xs sm:text-sm font-bold tracking-wider uppercase text-white shadow-lg transition-all duration-200 hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: selectedAvatar.accentColor,
                  boxShadow: `0 4px 20px ${selectedAvatar.glowColor}`,
                }}
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                Select Character
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
