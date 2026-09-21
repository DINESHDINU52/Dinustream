'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { MediaItem } from '@/types/cinema';
import { mediaService } from '@/lib/services/mediaService';
import { Modal } from '@/components/ui/Modal';
import { Search, Film, Tv, Check } from 'lucide-react';

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
  const [availableItems, setAvailableItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  /*
    Load the selectable catalogue when the sheet opens.

    Deferred by a microtask so the synchronous `setLoading(true)` runs after the
    effect body rather than inside it (react-hooks/set-state-in-effect: a
    synchronous setState in an effect forces a cascading render before paint).
    The `cancelled` flag also stops a slow response from populating the list
    after the user has already dismissed the sheet.
  */
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const [movies, series] = await Promise.all([
          mediaService.getMovies(30),
          mediaService.getSeries(15),
        ]);
        if (!cancelled) setAvailableItems([...movies, ...series]);
      } catch {
        // Catalogue stays as-is; the sheet shows its empty state.
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    return availableItems.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genres.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory =
        categoryFilter === 'all' ? true : categoryFilter === 'movies' ? item.type === 'movie' : item.type === 'series';
      return matchesSearch && matchesCategory;
    });
  }, [availableItems, searchQuery, categoryFilter]);

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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090d16] border border-slate-700/50 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500/60 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-[#090d16] rounded-xl border border-slate-700/50 w-full sm:w-auto justify-center">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('movies')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === 'movies'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3" />
              <span>Movies</span>
            </button>
            <button
              onClick={() => setCategoryFilter('series')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                categoryFilter === 'series'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3 h-3" />
              <span>Series</span>
            </button>
          </div>
        </div>

        {/* Media Grid */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin mx-auto mb-2" />
            <span>Loading library items...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const isCurrent = item.id === currentMovieId;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectMovie(item);
                    onClose();
                  }}
                  className={`group relative rounded-xl overflow-hidden bg-[#0d1320] border cursor-pointer transition-all duration-200 transform hover:-translate-y-1 ${
                    isCurrent
                      ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                      : 'border-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div className="relative aspect-[2/3] w-full bg-slate-900">
                    {/*
                      Plain <img>: posters are served from the self-hosted
                      Jellyfin proxy at /api/jellyfin/*, which next/image cannot
                      optimise without whitelisting a remote pattern for every
                      deployment. `loading="lazy"` covers the real cost here —
                      this grid can hold 45 posters.
                    */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.posterUrl}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                    />
                    {isCurrent && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-rose-600 text-white shadow-md">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] font-mono text-slate-300">
                      {item.runtime}
                    </div>
                  </div>

                  <div className="p-2.5">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {item.releaseYear} • {item.genres.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
