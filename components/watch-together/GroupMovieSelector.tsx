'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { MOCK_MOVIES, MOCK_SERIES, FEATURED_HERO_MEDIA } from '@/lib/mock-data';
import { Modal } from '@/components/ui/Modal';
import { Search, Film, Tv, Check } from 'lucide-react';
import Image from 'next/image';

interface GroupMovieSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMovie: (movie: MediaItem) => void;
  currentMovieId?: string;
}

export function GroupMovieSelector({
  isOpen,
  onClose,
  onSelectMovie,
  currentMovieId,
}: GroupMovieSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'movies' | 'series'>('all');

  const allAvailableItems = useMemo(() => {
    return [FEATURED_HERO_MEDIA, ...MOCK_MOVIES, ...MOCK_SERIES];
  }, []);

  const filteredItems = useMemo(() => {
    return allAvailableItems.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        categoryFilter === 'all' ? true : categoryFilter === 'movies' ? item.type === 'movie' : item.type === 'series';
      return matchesSearch && matchesCategory;
    });
  }, [allAvailableItems, searchQuery, categoryFilter]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      kicker="Watch Together Selector"
      title="Select Feature Presentation"
      description="Choose a title for your private synchronized screening. Both Dinu & Kanmani will synchronize to this selection."
      size="xl"
    >
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search 4K HDR films, series, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#0d1421] border border-white/[0.08] text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0d1421] border border-white/[0.08] w-full sm:w-auto">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                categoryFilter === 'all'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('movies')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                categoryFilter === 'movies'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies</span>
            </button>
            <button
              onClick={() => setCategoryFilter('series')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                categoryFilter === 'series'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Series</span>
            </button>
          </div>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto pr-1 py-1 custom-scrollbar">
          {filteredItems.map((item) => {
            const isSelected = item.id === currentMovieId;

            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  onSelectMovie(item);
                  onClose();
                }}
                className={`group cursor-pointer rounded-xl border p-2.5 transition-all duration-200 flex gap-3 ${
                  isSelected
                    ? 'bg-sky-500/15 border-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.2)]'
                    : 'bg-[#0b111c] border-white/[0.08] hover:border-white/[0.2] hover:bg-[#101928]'
                }`}
              >
                {/* Poster Thumbnail */}
                <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 relative shadow-md">
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    width={64}
                    height={96}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-sky-600/50 flex items-center justify-center backdrop-blur-xs">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="font-semibold text-sm text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.releaseYear} • {item.runtime} • {item.rating}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 font-light">
                      {item.overview}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {item.badges.slice(0, 2).map((badge) => (
                      <span
                        key={badge}
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300 border border-white/10"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
