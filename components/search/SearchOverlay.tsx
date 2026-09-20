'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchCategory, SearchResultItem } from '@/types/search';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  X,
  Play,
  Film,
  Tv,
  ListVideo,
  Music,
  Clock,
  Sparkles,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import Image from 'next/image';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: Array<{ id: SearchCategory; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'movie', label: 'Movies', icon: <Film className="w-3.5 h-3.5" /> },
  { id: 'series', label: 'Series', icon: <Tv className="w-3.5 h-3.5" /> },
  { id: 'episode', label: 'Episodes', icon: <ListVideo className="w-3.5 h-3.5" /> },
  { id: 'music', label: 'Music', icon: <Music className="w-3.5 h-3.5" /> },
];

const GENRES = [
  'all',
  'Action',
  'Sci-Fi',
  'Drama',
  'Romance',
  'Thriller',
  'Comedy',
  'Horror',
  'Music',
];

const YEARS = [
  { id: 'all', label: 'All Years' },
  { id: '2024', label: '2024' },
  { id: '2023', label: '2023' },
  { id: '2022', label: '2022' },
  { id: 'older', label: 'Classic' },
];

const LANGUAGES = [
  'all',
  'English',
  'Tamil',
  'Spanish',
  'French',
  'Japanese',
];

const RESOLUTIONS = [
  { id: 'all', label: 'All Res' },
  { id: '4K UHD', label: '4K UHD' },
  { id: '1080p FHD', label: '1080p' },
];

const AUDIO_FORMATS = [
  { id: 'all', label: 'All Audio' },
  { id: 'Dolby Atmos', label: 'Dolby Atmos' },
  { id: 'Dolby Digital Plus 5.1', label: '5.1 Surround' },
  { id: 'Spatial Audio', label: 'Spatial Audio' },
];

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const {
    query,
    setQuery,
    filters,
    updateFilter,
    resetFilters,
    results,
    isLoading,
    activeIndex,
    setActiveIndex,
    recentSearches,
    executeRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    selectItem,
  } = useGlobalSearch();

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active item into view during keyboard navigation
  useEffect(() => {
    if (!resultsContainerRef.current) return;
    const activeEl = resultsContainerRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  const hasActiveFilters =
    filters.genre !== 'all' ||
    filters.year !== 'all' ||
    filters.language !== 'all' ||
    filters.resolution !== 'all' ||
    filters.audio !== 'all' ||
    filters.recentlyAddedOnly;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-start bg-black/85 backdrop-blur-2xl text-slate-100 overflow-hidden">
      {/* Backdrop Dismiss */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />

      {/* Main Search Panel Container */}
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl mx-auto flex flex-col max-h-screen sm:max-h-[92vh] sm:mt-6 sm:rounded-2xl bg-[#070c16]/95 border-b sm:border border-white/[0.12] shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        {/* Top Search Input Bar */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center gap-3 relative">
          <Search className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400 flex-shrink-0" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, series, episodes, music (e.g. Dune, DC, Hans Zimmer)..."
            id="global-search-input"
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 outline-none font-medium selection:bg-sky-500/30"
          />

          {isLoading && (
            <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}

          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Close Button / Keyboard Tag */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-white/10">
            <span className="px-2 py-0.5 rounded bg-white/[0.08] text-[10px] font-mono text-slate-400 border border-white/10">
              ESC
            </span>
          </div>

          <button
            onClick={onClose}
            className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#090f1c] border-b border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateFilter({ category: cat.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  filters.category === cat.id
                    ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Results Count & Recently Added Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() =>
                updateFilter({ recentlyAddedOnly: !filters.recentlyAddedOnly })
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition-all ${
                filters.recentlyAddedOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white bg-white/[0.04]'
              }`}
            >
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Recently Added</span>
            </button>
          </div>
        </div>

        {/* Detailed Filters Drawer / Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-[#070b14] border-b border-white/[0.06] flex items-center gap-2 sm:gap-3 overflow-x-auto text-xs">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 flex-shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
            <span>Filters:</span>
          </div>

          {/* Genre Select */}
          <select
            value={filters.genre}
            onChange={(e) => updateFilter({ genre: e.target.value })}
            className="px-2.5 py-1 rounded-lg bg-[#0e1626] border border-white/10 text-slate-300 hover:text-white outline-none cursor-pointer text-xs"
          >
            <option value="all">All Genres</option>
            {GENRES.filter((g) => g !== 'all').map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Year Select */}
          <select
            value={filters.year}
            onChange={(e) => updateFilter({ year: e.target.value })}
            className="px-2.5 py-1 rounded-lg bg-[#0e1626] border border-white/10 text-slate-300 hover:text-white outline-none cursor-pointer text-xs"
          >
            {YEARS.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label}
              </option>
            ))}
          </select>

          {/* Language Select */}
          <select
            value={filters.language}
            onChange={(e) => updateFilter({ language: e.target.value })}
            className="px-2.5 py-1 rounded-lg bg-[#0e1626] border border-white/10 text-slate-300 hover:text-white outline-none cursor-pointer text-xs"
          >
            <option value="all">All Languages</option>
            {LANGUAGES.filter((l) => l !== 'all').map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          {/* Resolution Select */}
          <select
            value={filters.resolution}
            onChange={(e) => updateFilter({ resolution: e.target.value })}
            className="px-2.5 py-1 rounded-lg bg-[#0e1626] border border-white/10 text-slate-300 hover:text-white outline-none cursor-pointer text-xs"
          >
            {RESOLUTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Audio Select */}
          <select
            value={filters.audio}
            onChange={(e) => updateFilter({ audio: e.target.value })}
            className="px-2.5 py-1 rounded-lg bg-[#0e1626] border border-white/10 text-slate-300 hover:text-white outline-none cursor-pointer text-xs"
          >
            {AUDIO_FORMATS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-2 py-1 rounded-md text-[11px] font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-1 transition-colors flex-shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Recent Searches Pill Row */}
        {recentSearches.length > 0 && (
          <div className="px-4 sm:px-5 py-2 bg-[#090d18] border-b border-white/[0.04] flex items-center justify-between gap-2 overflow-x-auto text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Recent:
              </span>
              {recentSearches.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white cursor-pointer border border-white/[0.06] transition-all text-xs"
                >
                  <button
                    type="button"
                    onClick={() => executeRecentSearch(term)}
                    className="hover:underline"
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRecentSearch(term)}
                    className="p-0.5 text-slate-500 hover:text-rose-400"
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <button
              onClick={clearRecentSearches}
              className="text-[10px] font-mono text-slate-500 hover:text-rose-400 flex-shrink-0"
            >
              Clear
            </button>
          </div>
        )}

        {/* Results Container */}
        <div
          ref={resultsContainerRef}
          className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 max-h-[60vh]"
        >
          {results.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-300">
                {query.trim()
                  ? `No results matching "${query}"`
                  : 'Type to discover 4K movies, series, episodes, and spatial audio music.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-sky-400 hover:underline font-mono"
                >
                  Clear active filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1">
                <span>
                  Showing {results.length} result{results.length !== 1 && 's'}
                </span>
                <span className="hidden sm:inline">Use ↑ ↓ arrows to navigate • Enter to play</span>
              </div>

              {results.map((item, idx) => {
                const isActive = idx === activeIndex;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    data-active={isActive}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => selectItem(item)}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-4 cursor-pointer transition-all ${
                      isActive
                        ? 'bg-sky-500/15 border-sky-400/60 shadow-[0_0_24px_rgba(14,165,233,0.15)]'
                        : 'bg-[#090e18] border-white/[0.06] hover:border-white/[0.16] hover:bg-[#0c1322]'
                    }`}
                  >
                    {/* Left: Poster & Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Thumbnail Poster */}
                      <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 relative border border-white/10">
                        <Image
                          src={item.posterUrl}
                          alt={item.title}
                          width={56}
                          height={80}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-semibold text-white truncate">
                            {item.title}
                          </h4>

                          <Badge
                            variant={
                              item.type === 'movie'
                                ? 'sync'
                                : item.type === 'series'
                                ? 'midnight'
                                : item.type === 'music'
                                ? 'atmos'
                                : 'silver'
                            }
                            size="sm"
                          >
                            {item.type.toUpperCase()}
                          </Badge>

                          {item.isRecentlyAdded && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                              SSD Cached
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                          {item.artist
                            ? item.artist
                            : item.seriesTitle
                            ? `${item.seriesTitle} • S${item.seasonNumber}:E${item.episodeNumber}`
                            : `${item.releaseYear} • ${item.runtime || '2h'} • ${item.rating || 'U/A'}`}
                        </p>

                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 hidden sm:block">
                          {item.overview}
                        </p>

                        {/* Format Badges */}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {item.resolution && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.08] text-slate-300">
                              {item.resolution}
                            </span>
                          )}
                          {item.audioFormat && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                              {item.audioFormat}
                            </span>
                          )}
                          {item.language && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400">
                              {item.language}
                            </span>
                          )}
                          {item.genres?.slice(0, 2).map((g) => (
                            <span
                              key={g}
                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-400"
                            >
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Quick Play Trigger */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectItem(item);
                        }}
                        className={`p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                          isActive
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                            : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline">Play</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
