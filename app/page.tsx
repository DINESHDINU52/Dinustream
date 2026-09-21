'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { HeroCarousel } from '@/components/media/HeroCarousel';
import { MediaCarousel } from '@/components/media/MediaCarousel';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { mediaService } from '@/lib/services/mediaService';
import { mediaCache } from '@/lib/cache/mediaCache';
import { MediaItem } from '@/types/cinema';
import { SyncAndPlayButton } from '@/components/sync';
import { Play, Zap, Film, Sparkles, Tv, Star, Flame, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shared horizontal gutters — matches the rails inside MediaCarousel. */
const GUTTER = 'px-4 sm:px-8 lg:px-12';

/** How long a toast stays on screen. */
const TOAST_MS = 3500;

/**
 * Category chips shown under the hero. Previously these were seven copies of
 * the same 12-line button, which is how the class lists drifted out of sync;
 * driving them from data keeps every chip identical.
 */
const CATEGORY_CHIPS = [
  { key: 'all', label: 'All Vault', icon: Sparkles, iconClass: 'text-cyan-400', targetId: undefined },
  { key: 'top10', label: 'Top 10 Today', icon: Flame, iconClass: 'text-amber-400', targetId: 'top-10' },
  { key: 'movies', label: 'Feature Movies', icon: Film, iconClass: 'text-sky-400', targetId: 'movies' },
  { key: 'series', label: 'TV Series', icon: Tv, iconClass: 'text-rose-400', targetId: 'series' },
  { key: 'new', label: 'Newly Added', icon: Star, iconClass: 'text-amber-300', targetId: 'new-movies' },
  { key: 'atmos', label: 'Spatial Audio', icon: Zap, iconClass: 'text-cyan-400', targetId: 'dolby-vault' },
  { key: 'mylist', label: 'My Watchlist', icon: Bookmark, iconClass: 'text-emerald-400', targetId: 'my-list' },
] as const;

export default function CinemaHomePage() {
  const router = useRouter();
  const { profile, companionProfile, continueWatching, myList, toggleMyList } = useActiveProfile();

  const [featuredItems, setFeaturedItems] = useState<MediaItem[]>(() => mediaCache.getInstantValue('featured_7') || []);
  const [movies, setMovies] = useState<MediaItem[]>(() => mediaCache.getInstantValue('movies_50') || []);
  const [series, setSeries] = useState<MediaItem[]>(() => mediaCache.getInstantValue('series_20') || []);
  const [recentlyAdded, setRecentlyAdded] = useState<MediaItem[]>(() => mediaCache.getInstantValue('recent_20') || []);
  const [newlyAddedMovies, setNewlyAddedMovies] = useState<MediaItem[]>(() => mediaCache.getInstantValue('new_movies_20') || []);

  /*
    Skip the spinner when the stale-while-revalidate cache already produced
    content for the first paint; the refresh then happens invisibly behind the
    rendered catalogue. Evaluated in a lazy initialiser so it reflects the state
    at mount only.
  */
  const [loading, setLoading] = useState(
    () => featuredItems.length === 0 && movies.length === 0
  );
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const loadMediaData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [featured, moviesData, seriesData, recentData, newMoviesData] = await Promise.all([
        mediaService.getFeaturedItems(7),
        mediaService.getMovies(50),
        mediaService.getSeries(20),
        mediaService.getRecentlyAdded(20),
        mediaService.getNewlyAddedMovies(20),
      ]);

      setFeaturedItems(featured || []);
      setMovies(moviesData || []);
      setSeries(seriesData || []);
      setRecentlyAdded(recentData || []);
      setNewlyAddedMovies(
        newMoviesData && newMoviesData.length > 0 ? newMoviesData : (moviesData || []).slice(0, 10)
      );
    } catch (err) {
      console.error('[CinemaHomePage] Error loading library:', err);
      setError('Unable to load cinema catalog from media server');
    } finally {
      setLoading(false);
    }
  }, []);

  /*
    Kick off the catalogue fetch. Wrapped in a microtask-deferred call so the
    synchronous `setLoading(true)` inside `loadMediaData` does not run during
    the effect body — React flags that as a cascading render
    (react-hooks/set-state-in-effect) because it forces a second render pass
    before the browser has painted the first one.
  */
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void loadMediaData();
    });
    return () => {
      cancelled = true;
    };
  }, [loadMediaData]);

  /* Auto-dismiss the toast, cancelling any in-flight timer. */
  useEffect(() => {
    if (!toastInfo) return;
    const timer = setTimeout(() => setToastInfo(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toastInfo]);

  const notify = (message: string, subtext?: string) => setToastInfo({ message, subtext });

  const handleToggleSave = (media: MediaItem) => {
    const added = toggleMyList(media.id);
    notify(
      added ? `Added "${media.title}" to ${profile.name}'s List` : `Removed "${media.title}" from My List`,
      'Updated private screening list'
    );
  };

  const handleOpenDetails = (media: MediaItem) => {
    setSelectedMedia(media);
    setIsDetailsModalOpen(true);
  };

  // Every loaded item, keyed by id, for fast watchlist lookups.
  const allMediaMap = useMemo(() => {
    const map = new Map<string, MediaItem>();
    [...featuredItems, ...movies, ...series, ...recentlyAdded, ...newlyAddedMovies].forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
    return map;
  }, [featuredItems, movies, series, recentlyAdded, newlyAddedMovies]);

  const myListItems = useMemo(
    () => myList.map((id) => allMediaMap.get(id)).filter((item): item is MediaItem => Boolean(item)),
    [myList, allMediaMap]
  );

  // Top 10 across series and movies.
  const top10Items = useMemo(() => {
    const unique = new Map<string, MediaItem>();
    for (const item of [...series, ...movies]) {
      if (!unique.has(item.id)) unique.set(item.id, item);
      if (unique.size >= 10) break;
    }
    return Array.from(unique.values());
  }, [series, movies]);

  /*
    Spatial-audio showcase. Accepts both badge spellings so this row agrees
    with the hero badge and the card badge (the adapter emits "Dolby Atmos",
    the curated catalogue uses "Spatial Audio").
  */
  const atmosItems = useMemo(
    () =>
      Array.from(allMediaMap.values()).filter(
        (m) =>
          m.badges?.some((b) => b === 'Dolby Atmos' || b === 'Spatial Audio') ||
          m.audioFormats?.some((a) => a.includes('Atmos'))
      ),
    [allMediaMap]
  );

  const handleCategoryClick = (categoryKey: string, targetId?: string) => {
    setActiveCategory(categoryKey);
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /** Series open their episode list; movies go straight to playback. */
  const playItem = (item: MediaItem) => {
    router.push(item.type === 'series' ? `/series/${item.id}` : `/watch/${item.id}`);
  };

  const chipCount: Record<string, number | undefined> = {
    movies: movies.length,
    series: series.length,
    mylist: myList.length,
  };

  return (
    <CinemaShell>
      <Toast
        isVisible={Boolean(toastInfo)}
        message={toastInfo?.message ?? ''}
        subtext={toastInfo?.subtext}
        onDismiss={() => setToastInfo(null)}
      />

      {/* Media details / playback preparation modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedMedia?.title || 'Cinema Details'}
      >
        {selectedMedia && (
          <div className="space-y-4">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/[0.08] bg-[#090e1a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedMedia.backdropUrl || selectedMedia.posterUrl}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090e1a] via-[#090e1a]/40 to-transparent" />
              {/* Metadata pills wrap on narrow sheets instead of overflowing */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                  {selectedMedia.releaseYear}
                </span>
                {selectedMedia.runtime && (
                  <span className="text-[11px] font-mono text-slate-300 bg-black/60 px-2 py-0.5 rounded">
                    {selectedMedia.runtime}
                  </span>
                )}
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  {selectedMedia.matchScore || 98}% Match
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-light">
              {selectedMedia.overview || 'Calibrated cinema master encoded in direct play stream.'}
            </p>

            {selectedMedia.badges.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMedia.badges.map((badge) => (
                  <Badge
                    key={badge}
                    variant={
                      badge === 'Dolby Atmos' || badge === 'Spatial Audio'
                        ? 'atmos'
                        : badge === 'Dolby Vision'
                        ? 'vision'
                        : 'uhd'
                    }
                    size="sm"
                  >
                    {badge}
                  </Badge>
                ))}
              </div>
            )}

            {/*
              Action row stacks on phones. Previously `flex items-center gap-3`
              with a `flex-1` primary button squeezed four controls into a
              single row, so on a 360px sheet the labels were clipped.
            */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 pt-1">
              <Button
                variant="primary"
                size="md"
                icon={<Play className="w-4 h-4 fill-current" />}
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  playItem(selectedMedia);
                }}
                className="w-full sm:flex-1 justify-center"
              >
                {selectedMedia.type === 'series' ? 'Browse Episodes' : 'Play Direct Stream'}
              </Button>

              <div className="flex items-center gap-2.5">
                <SyncAndPlayButton media={selectedMedia} size="md" />

                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1 justify-center sm:flex-none"
                  onClick={() => handleToggleSave(selectedMedia)}
                >
                  {myList.includes(selectedMedia.id) ? 'Saved' : '+ List'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {error ? (
        <div className={cn('pt-navbar max-w-7xl mx-auto', GUTTER)}>
          <ErrorState
            title="Private Cinema Pipeline Unreachable"
            message={error}
            onRetry={loadMediaData}
          />
        </div>
      ) : loading ? (
        <div className="min-h-[70svh] flex flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="w-12 h-12 rounded-full border-2 border-sky-400/20 border-t-sky-400 animate-spin" />
          <p className="text-xs text-slate-400 tracking-wider font-mono uppercase">
            Connecting to DinuStream Private Cinema...
          </p>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-12 md:space-y-14 pb-12">
          {/* 1. Featured hero carousel */}
          {featuredItems.length > 0 ? (
            <HeroCarousel
              items={featuredItems}
              savedIds={myList}
              onPlay={playItem}
              onSyncPlay={(item) => router.push(`/watch/${item.id}?sync=true`)}
              onToggleSave={handleToggleSave}
              onOpenDetails={handleOpenDetails}
            />
          ) : (
            <div className={cn('pt-navbar max-w-7xl mx-auto', GUTTER)}>
              <EmptyState
                icon={Film}
                title="Library Ready"
                description="Your private cinema vault is connected. Add media to your Jellyfin libraries to begin streaming."
                actionLabel="Refresh Vault"
                onAction={loadMediaData}
              />
            </div>
          )}

          {/* Category chip bar — horizontally scrollable, edge-to-edge on phones */}
          <div className="relative z-20 max-w-7xl mx-auto pt-2 sm:pt-6">
            <div
              className={cn('cinema-rail flex items-center gap-2 overflow-x-auto no-scrollbar py-2', GUTTER)}
              role="tablist"
              aria-label="Browse categories"
            >
              {CATEGORY_CHIPS.map(({ key, label, icon: Icon, iconClass, targetId }) => {
                const isActive = activeCategory === key;
                const count = chipCount[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleCategoryClick(key, targetId)}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus backdrop-blur-xl',
                      isActive
                        ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                        : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]'
                    )}
                  >
                    <Icon className={cn('w-3.5 h-3.5 shrink-0', isActive ? 'text-slate-700' : iconClass)} />
                    <span>{label}</span>
                    {typeof count === 'number' && <span className="opacity-70">({count})</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active profile session card */}
          <div className={cn('max-w-7xl mx-auto', GUTTER)}>
            <GlassPanel
              variant="standard"
              padding="md"
              className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-white/[0.08] bg-[#070b16]/70 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Avatar profile={profile} size="md" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      {profile.name}&apos;s Cinema Room
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Live Sync Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    {profile.statusMessage || 'High-fidelity cinema streaming calibrated for your display.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 w-full lg:w-auto">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Zap className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />}
                  onClick={() => router.push('/watch-together')}
                  id="nav-watch-together-btn"
                  className="flex-1 lg:flex-none justify-center"
                >
                  {/* Full copy needs room; phones get the short form. */}
                  <span className="sm:hidden">Watch Together</span>
                  <span className="hidden sm:inline">Watch Together with {companionProfile.name}</span>
                </Button>
                <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-slate-300 text-xs font-mono shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Direct Play 4K</span>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* 2. Continue watching */}
          {continueWatching.length > 0 && (
            <div id="continue-watching" className="scroll-mt-navbar">
              <MediaCarousel
                title="Continue Watching"
                kicker={`Resume for ${profile.name}`}
                subtitle={`Pick up right where ${profile.name} left off with frame-accurate sync.`}
                items={continueWatching}
                type="continue"
                onPlay={(item) => router.push(`/watch/${item.id}`)}
              />
            </div>
          )}

          {/* 3. Top 10 */}
          {top10Items.length > 0 && (
            <div id="top-10" className="scroll-mt-navbar">
              <MediaCarousel
                title="Top 10 in Dinustream Today"
                kicker="Trending Blockbusters"
                subtitle="The most-watched cinematic releases and television seasons across profiles."
                items={top10Items}
                type="poster"
                showRank
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => playItem(item as MediaItem)}
                onOpenDetails={handleOpenDetails}
              />
            </div>
          )}

          {/* 4. Newly added movies */}
          {newlyAddedMovies.length > 0 && (
            <div id="new-movies" className="scroll-mt-navbar">
              <MediaCarousel
                title="Newly Added Movies"
                kicker="Cinema Premieres"
                subtitle="Fresh cinematic releases and remastered theatrical masters just added to the vault."
                items={newlyAddedMovies}
                type="poster"
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => handleOpenDetails(item as MediaItem)}
                onOpenDetails={handleOpenDetails}
              />
            </div>
          )}

          {/* 5. Feature movies */}
          {movies.length > 0 && (
            <div id="movies" className="scroll-mt-navbar">
              <MediaCarousel
                title="Feature Movies"
                kicker="Cinema Presentations"
                subtitle="Theatrical and calibrated editions in native high-bitrate video."
                items={movies}
                type="poster"
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => handleOpenDetails(item as MediaItem)}
                onOpenDetails={handleOpenDetails}
              />
            </div>
          )}

          {/* 6. Television series */}
          {series.length > 0 && (
            <div id="series" className="scroll-mt-navbar">
              <MediaCarousel
                title="Television Series"
                kicker="Episodic Television"
                subtitle="Complete seasons with automated intro/recap skip markers and episode tracking."
                items={series}
                type="poster"
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => router.push(`/series/${item.id}`)}
                onOpenDetails={handleOpenDetails}
              />
            </div>
          )}

          {/* 7. Spatial audio showcases */}
          {atmosItems.length > 0 && (
            <div id="dolby-vault" className="scroll-mt-navbar">
              <MediaCarousel
                title="Spatial Audio Showcases"
                kicker="Spatial Acoustics"
                subtitle="Master audio tracks mixed for immersive 7.1.4 multi-channel overhead sound."
                items={atmosItems}
                type="backdrop"
                savedIds={myList}
                action={
                  <Badge variant="atmos" size="sm">
                    Spatial Audio
                  </Badge>
                }
                onToggleSave={handleToggleSave}
                onPlay={(item) => handleOpenDetails(item as MediaItem)}
                onOpenDetails={handleOpenDetails}
              />
            </div>
          )}

          {/* 8. My list */}
          <div id="my-list" className="scroll-mt-navbar">
            {myListItems.length > 0 ? (
              <MediaCarousel
                title="My Watchlist"
                kicker={`Curated by ${profile.name}`}
                subtitle={`Your private watchlist with ${myListItems.length} titles saved.`}
                items={myListItems}
                type="poster"
                savedIds={myList}
                action={
                  <Badge variant="midnight" size="sm">
                    {myListItems.length} Saved
                  </Badge>
                }
                onToggleSave={handleToggleSave}
                onPlay={(item) => handleOpenDetails(item as MediaItem)}
                onOpenDetails={handleOpenDetails}
              />
            ) : (
              <div className={cn('max-w-7xl mx-auto', GUTTER)}>
                <div className="mb-4">
                  <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                    Curated by {profile.name}
                  </span>
                  <h3 className="text-xl font-bold text-white">My Watchlist</h3>
                </div>
                <EmptyState
                  icon={Film}
                  title="Your Watchlist is Empty"
                  description="Browse the catalog above and tap the ＋ button on any movie or series to keep it here for private movie nights."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </CinemaShell>
  );
}
