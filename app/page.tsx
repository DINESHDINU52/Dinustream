'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { MediaItem } from '@/types/cinema';
import { SyncAndPlayButton } from '@/components/sync';
import { Play, Zap, Film, Sparkles, Tv, Star, Flame, Bookmark, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CinemaHomePage() {
  const router = useRouter();
  const { profile, companionProfile, continueWatching, myList, toggleMyList } = useActiveProfile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [featuredItems, setFeaturedItems] = useState<MediaItem[]>([]);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<MediaItem[]>([]);
  const [newlyAddedMovies, setNewlyAddedMovies] = useState<MediaItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const loadMediaData = async () => {
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

      setFeaturedItems(featured);
      setMovies(moviesData);
      setSeries(seriesData);
      setRecentlyAdded(recentData);
      setNewlyAddedMovies(
        newMoviesData && newMoviesData.length > 0
          ? newMoviesData
          : (moviesData ? moviesData.slice(0, 10) : [])
      );
    } catch (err) {
      console.error('[CinemaHomePage] Error loading library:', err);
      setError('Unable to load cinema catalog from media server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMediaData();
  }, []);

  const notify = (message: string, subtext?: string) => {
    setToastInfo({ message, subtext });
    setTimeout(() => setToastInfo(null), 3500);
  };

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

  // Compile all loaded items into a map for fast lookup
  const allMediaMap = useMemo(() => {
    const map = new Map<string, MediaItem>();
    [...featuredItems, ...movies, ...series, ...recentlyAdded, ...newlyAddedMovies].forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    return map;
  }, [featuredItems, movies, series, recentlyAdded, newlyAddedMovies]);

  // Derived user watchlist items
  const myListItems = useMemo(() => {
    return myList.map((id) => allMediaMap.get(id)).filter(Boolean) as MediaItem[];
  }, [myList, allMediaMap]);

  // DinuStream Top 10 Ranked items: Top 10 across movies & series
  const top10Items = useMemo(() => {
    const combined = [...series, ...movies];
    const unique = new Map<string, MediaItem>();
    for (const item of combined) {
      if (!unique.has(item.id)) {
        unique.set(item.id, item);
      }
      if (unique.size >= 10) break;
    }
    return Array.from(unique.values());
  }, [series, movies]);

  // Atmos audio showcase items
  const atmosItems = useMemo(() => {
    return Array.from(allMediaMap.values()).filter(
      (m) => m.badges?.includes('Dolby Atmos') || m.audioFormats?.some((a) => a.includes('Atmos'))
    );
  }, [allMediaMap]);

  // Category filter scroll handler
  const handleCategoryClick = (categoryKey: string, targetId?: string) => {
    setActiveCategory(categoryKey);
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <CinemaShell>
      {/* Toast feedback pill */}
      {toastInfo && (
        <Toast
          isVisible={!!toastInfo}
          message={toastInfo.message}
          subtext={toastInfo.subtext}
          onDismiss={() => setToastInfo(null)}
        />
      )}

      {/* Media Details / Playback Preparation Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title={selectedMedia?.title || 'Cinema Details'}
      >
        {selectedMedia && (
          <div className="space-y-4">
            <div
              className="relative aspect-video w-full rounded-xl overflow-hidden bg-cover bg-center border border-white/[0.08]"
              style={{
                backgroundImage: `url(${selectedMedia.backdropUrl || selectedMedia.posterUrl})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#090e1a] via-[#090e1a]/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                    {selectedMedia.releaseYear}
                  </span>
                  <span className="text-xs font-mono text-slate-300 bg-black/60 px-2 py-0.5 rounded">
                    {selectedMedia.runtime}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    {selectedMedia.matchScore || 98}% Match
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-light">
              {selectedMedia.overview || 'Calibrated cinema master encoded in direct play stream.'}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {selectedMedia.badges.map((badge) => (
                <Badge
                  key={badge}
                  variant={
                    badge === 'Dolby Atmos'
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

            <div className="flex items-center gap-3 pt-3">
              <Button
                variant="primary"
                size="md"
                icon={<Play className="w-4 h-4 fill-current" />}
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  if (selectedMedia.type === 'series') {
                    router.push(`/series/${selectedMedia.id}`);
                  } else {
                    router.push(`/watch/${selectedMedia.id}`);
                  }
                }}
                className="flex-1"
              >
                {selectedMedia.type === 'series' ? 'Browse Episodes' : 'Play Direct Stream'}
              </Button>

              <SyncAndPlayButton
                media={selectedMedia}
                size="md"
              />

              <Button
                variant="secondary"
                size="md"
                onClick={() => handleToggleSave(selectedMedia)}
              >
                {myList.includes(selectedMedia.id) ? 'Saved' : '+ List'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Main Container */}
      {error ? (
        <div className="pt-28 px-4 max-w-7xl mx-auto">
          <ErrorState
            title="Private Cinema Pipeline Unreachable"
            message={error}
            onRetry={loadMediaData}
          />
        </div>
      ) : loading ? (
        <div className="min-h-[85vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-sky-400/20 border-t-sky-400 animate-spin" />
          <p className="text-xs text-slate-400 tracking-wider font-mono uppercase">
            Connecting to DinuStream Private Cinema...
          </p>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-12 md:space-y-14 pb-20">
          {/* 1. DinuStream Multi-Slide Featured Hero Carousel */}
          {featuredItems.length > 0 ? (
            <HeroCarousel
              items={featuredItems}
              savedIds={myList}
              onPlay={(item) => {
                if (item.type === 'series') {
                  router.push(`/series/${item.id}`);
                } else {
                  router.push(`/watch/${item.id}`);
                }
              }}
              onSyncPlay={(item) => router.push(`/watch/${item.id}?sync=true`)}
              onToggleSave={handleToggleSave}
              onOpenDetails={handleOpenDetails}
            />
          ) : (
            <div className="pt-24 px-4 max-w-7xl mx-auto">
              <EmptyState
                icon={Film}
                title="Library Ready"
                description="Your private cinema vault is connected. Add media to your Jellyfin libraries to begin streaming."
                actionLabel="Refresh Vault"
                onAction={loadMediaData}
              />
            </div>
          )}

          {/* Luxury Cinema Category Navigation Bar */}
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6 relative z-20">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
              <button
                onClick={() => handleCategoryClick('all')}
                className={cn(
                  'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus flex items-center gap-1.5 backdrop-blur-xl',
                  activeCategory === 'all'
                    ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]'
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>All Vault</span>
              </button>

              <button
                onClick={() => handleCategoryClick('top10', 'top-10')}
                className={cn(
                  'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus flex items-center gap-1.5 backdrop-blur-xl',
                  activeCategory === 'top10'
                    ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]'
                )}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Top 10 Today</span>
              </button>

              <button
                onClick={() => handleCategoryClick('movies', 'movies')}
                className={cn(
                  'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus flex items-center gap-1.5 backdrop-blur-xl',
                  activeCategory === 'movies'
                    ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]'
                )}
              >
                <Film className="w-3.5 h-3.5 text-sky-400" />
                <span>Feature Movies ({movies.length})</span>
              </button>

              <button
                onClick={() => handleCategoryClick('series', 'series')}
                className={cn(
                  'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus flex items-center gap-1.5 backdrop-blur-xl',
                  activeCategory === 'series'
                    ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]'
                )}
              >
                <Tv className="w-3.5 h-3.5 text-rose-400" />
                <span>TV Series ({series.length})</span>
              </button>

              <button
                onClick={() => handleCategoryClick('new', 'new-movies')}
                className={cn(
                  'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus flex items-center gap-1.5 backdrop-blur-xl',
                  activeCategory === 'new'
                    ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]'
                )}
              >
                <Star className="w-3.5 h-3.5 text-amber-300" />
                <span>Newly Added</span>
              </button>

              <button
                onClick={() => handleCategoryClick('atmos', 'dolby-vault')}
                className={cn(
                  'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus flex items-center gap-1.5 backdrop-blur-xl',
                  activeCategory === 'atmos'
                    ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]'
                )}
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dolby Atmos Vault</span>
              </button>

              <button
                onClick={() => handleCategoryClick('mylist', 'my-list')}
                className={cn(
                  'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold tracking-wide whitespace-nowrap transition-all cinema-focus flex items-center gap-1.5 backdrop-blur-xl',
                  activeCategory === 'mylist'
                    ? 'bg-white text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08]'
                )}
              >
                <Bookmark className="w-3.5 h-3.5 text-emerald-400" />
                <span>My Watchlist ({myList.length})</span>
              </button>
            </div>
          </div>

          {/* Active Profile Session Card */}
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            <GlassPanel
              variant="standard"
              padding="md"
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-white/[0.08] bg-[#070b16]/70 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3.5">
                <Avatar profile={profile} size="md" />
                <div>
                  <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-2.5">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Zap className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />}
                  onClick={() => router.push('/watch-together')}
                  id="nav-watch-together-btn"
                >
                  Watch Together with {companionProfile.name}
                </Button>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] text-slate-300 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Direct Play 4K</span>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* 2. Continue Watching (Only shown if user has actual in-progress items) */}
          {continueWatching.length > 0 && (
            <div id="continue-watching">
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

          {/* 3. DinuStream Top 10 in Dinustream */}
          {top10Items.length > 0 && (
            <div id="top-10">
              <MediaCarousel
                title="Top 10 in Dinustream Today"
                kicker="Trending Blockbusters"
                subtitle="The most-watched cinematic releases and television seasons across profiles."
                items={top10Items}
                type="poster"
                showRank={true}
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => {
                  if ((item as MediaItem).type === 'series') {
                    router.push(`/series/${item.id}`);
                  } else {
                    router.push(`/watch/${item.id}`);
                  }
                }}
                onOpenDetails={(item: MediaItem) => handleOpenDetails(item)}
              />
            </div>
          )}

          {/* 4. Newly Added Movies */}
          {newlyAddedMovies.length > 0 && (
            <div id="new-movies">
              <MediaCarousel
                title="Newly Added Movies"
                kicker="Cinema Premieres"
                subtitle="Fresh cinematic releases and remastered theatrical masters just added to the vault."
                items={newlyAddedMovies}
                type="poster"
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => handleOpenDetails(item as MediaItem)}
                onOpenDetails={(item: MediaItem) => handleOpenDetails(item)}
              />
            </div>
          )}

          {/* 5. Feature Movies */}
          {movies.length > 0 && (
            <div id="movies">
              <MediaCarousel
                title="Feature Movies"
                kicker="Cinema Presentations"
                subtitle="Theatrical and calibrated editions in native high-bitrate video."
                items={movies}
                type="poster"
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => handleOpenDetails(item as MediaItem)}
                onOpenDetails={(item: MediaItem) => handleOpenDetails(item)}
              />
            </div>
          )}

          {/* 6. Television Series */}
          {series.length > 0 && (
            <div id="series">
              <MediaCarousel
                title="Television Series"
                kicker="Episodic Television"
                subtitle="Complete seasons with automated intro/recap skip markers and episode tracking."
                items={series}
                type="poster"
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => router.push(`/series/${item.id}`)}
                onOpenDetails={(item: MediaItem) => handleOpenDetails(item)}
              />
            </div>
          )}

          {/* 7. Dolby Atmos Audio Showcases */}
          {atmosItems.length > 0 && (
            <div id="dolby-vault">
              <MediaCarousel
                title="Dolby Atmos Showcases"
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
                onOpenDetails={(item: MediaItem) => handleOpenDetails(item)}
              />
            </div>
          )}

          {/* 8. My List */}
          <div id="my-list">
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
                onOpenDetails={(item: MediaItem) => handleOpenDetails(item)}
              />
            ) : (
              <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
                <div className="mb-4">
                  <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                    Curated by {profile.name}
                  </span>
                  <h3 className="text-xl font-bold text-white">My Watchlist</h3>
                </div>
                <EmptyState
                  icon={Film}
                  title="Your Watchlist is Empty"
                  description="Browse the catalog above and click '＋ My List' on any movie or series to keep it here for private movie nights."
                />
              </div>
            )}
          </div>
        </div>
      )}
    </CinemaShell>
  );
}
