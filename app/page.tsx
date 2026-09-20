'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { HeroBanner } from '@/components/media/HeroBanner';
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
import { Play, Zap, Film } from 'lucide-react';

export default function CinemaHomePage() {
  const router = useRouter();
  const { profile, companionProfile, continueWatching, myList, toggleMyList } = useActiveProfile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [heroMedia, setHeroMedia] = useState<MediaItem | null>(null);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [recentlyAdded, setRecentlyAdded] = useState<MediaItem[]>([]);

  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const loadMediaData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hero, moviesData, seriesData, recentData] = await Promise.all([
        mediaService.getHeroItem(),
        mediaService.getMovies(30),
        mediaService.getSeries(20),
        mediaService.getRecentlyAdded(20),
      ]);

      setHeroMedia(hero);
      setMovies(moviesData);
      setSeries(seriesData);
      setRecentlyAdded(recentData);
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
  const allMediaItemsMap = useMemo(() => {
    const map = new Map<string, MediaItem>();
    if (heroMedia) map.set(heroMedia.id, heroMedia);
    movies.forEach((m) => map.set(m.id, m));
    series.forEach((s) => map.set(s.id, s));
    recentlyAdded.forEach((r) => map.set(r.id, r));
    return map;
  }, [heroMedia, movies, series, recentlyAdded]);

  // Derive My List from real saved items
  const myListItems = useMemo(() => {
    return myList
      .map((id) => allMediaItemsMap.get(id))
      .filter((item): item is MediaItem => Boolean(item));
  }, [myList, allMediaItemsMap]);

  // Derive items with spatial / Atmos audio
  const atmosItems = useMemo(() => {
    const combined = [...movies, ...series];
    return combined.filter(
      (m) =>
        m.badges.includes('Dolby Atmos') ||
        (m.audioFormats && m.audioFormats.some((a) => a.toLowerCase().includes('atmos') || a.toLowerCase().includes('truehd')))
    );
  }, [movies, series]);

  const activeModalMedia = selectedMedia || heroMedia;

  return (
    <CinemaShell>
      {/* Toast Notification System */}
      <Toast
        message={toastInfo?.message || ''}
        subtext={toastInfo?.subtext}
        type="sync"
        isVisible={Boolean(toastInfo)}
        onDismiss={() => setToastInfo(null)}
      />

      {/* Feature Details Modal */}
      {activeModalMedia && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          kicker="Feature Details"
          title={activeModalMedia.title}
          description={`${activeModalMedia.releaseYear} • ${activeModalMedia.runtime} • ${activeModalMedia.rating} • ${activeModalMedia.genres.join(', ')}`}
          size="lg"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close
              </Button>
              <SyncAndPlayButton
                media={activeModalMedia}
                variant="primary"
                size="sm"
                isGroupMode={true}
                onBeforeSync={() => setIsDetailsModalOpen(false)}
              />
              <Button
                variant="silver"
                size="sm"
                icon={<Play className="w-3.5 h-3.5 fill-current" />}
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  router.push(`/watch/${activeModalMedia.id}`);
                }}
              >
                Play
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed font-light">
              {activeModalMedia.overview}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#0d1421] border border-white/[0.06]">
                <p className="text-[10px] font-mono uppercase text-slate-400">Audio Formats</p>
                <p className="text-xs font-medium text-white mt-0.5 truncate">
                  {activeModalMedia.audioFormats && activeModalMedia.audioFormats.length > 0
                    ? activeModalMedia.audioFormats.join(', ')
                    : 'Dolby Digital / Surround'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[#0d1421] border border-white/[0.06]">
                <p className="text-[10px] font-mono uppercase text-slate-400">Visual Quality</p>
                <p className="text-xs font-medium text-white mt-0.5">
                  {activeModalMedia.badges.includes('4K UHD') ? '4K Ultra HD' : '1080p Full HD'}
                  {activeModalMedia.badges.includes('Dolby Vision') ? ' • Dolby Vision' : ''}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeModalMedia.badges.map((b) => (
                <Badge key={b} variant="midnight" size="sm">
                  {b}
                </Badge>
              ))}
              {activeModalMedia.subtitleLanguages && activeModalMedia.subtitleLanguages.length > 0 && (
                <Badge variant="silver" size="sm">
                  {activeModalMedia.subtitleLanguages.join(', ')}
                </Badge>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Main Content Area */}
      {error ? (
        <div className="max-w-4xl mx-auto px-4 py-24">
          <ErrorState message={error} onRetry={loadMediaData} />
        </div>
      ) : loading ? (
        <div className="min-h-[80vh] flex flex-col justify-center items-center gap-4">
          <div className="w-10 h-10 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 tracking-wider font-mono uppercase">
            Connecting to DinuStream Private Cinema...
          </p>
        </div>
      ) : (
        <div className="space-y-10 sm:space-y-14 md:space-y-16 pb-16">
          {/* 1. Large Cinematic Hero Section */}
          {heroMedia ? (
            <HeroBanner
              media={heroMedia}
              isSaved={myList.includes(heroMedia.id)}
              onPlay={() => router.push(`/watch/${heroMedia.id}`)}
              onSyncPlay={() => router.push(`/watch/${heroMedia.id}?sync=true`)}
              onToggleSave={() => handleToggleSave(heroMedia)}
              onOpenDetails={() => handleOpenDetails(heroMedia)}
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

          {/* Screening Room Presence Status Banner */}
          <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
            <GlassPanel
              variant="standard"
              padding="md"
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-slate-400/[0.12]"
            >
              <div className="flex items-center gap-3.5">
                <Avatar profile={profile} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-semibold text-white">
                      Private Cinema Suite • {profile.name}
                    </h2>
                    <Badge variant="midnight" size="sm">Private Cloud</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    {profile.statusMessage}
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
                  Watch Together
                </Button>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0d1421] border border-white/[0.08] text-slate-400 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Direct Play 4K</span>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* 2. Continue Watching (Only shown if user has actual in-progress items) */}
          {continueWatching.length > 0 && (
            <MediaCarousel
              title="Continue Watching"
              kicker={`Resume for ${profile.name}`}
              subtitle={`Pick up right where ${profile.name} left off with frame-accurate sync.`}
              items={continueWatching}
              type="continue"
              onPlay={(item) => router.push(`/watch/${item.id}`)}
            />
          )}

          {/* 3. Recently Added */}
          {recentlyAdded.length > 0 && (
            <MediaCarousel
              title="Recently Added"
              kicker="New Vault Arrivals"
              subtitle="Freshly indexed masters synced directly to your private library."
              items={recentlyAdded}
              type="poster"
              savedIds={myList}
              onToggleSave={handleToggleSave}
              onPlay={(item) => handleOpenDetails(item as MediaItem)}
            />
          )}

          {/* 4. Feature Movies */}
          {movies.length > 0 && (
            <div id="movies">
              <MediaCarousel
                title="Movies"
                kicker="Feature Presentations"
                subtitle="Theatrical and calibrated editions in native high-bitrate video."
                items={movies}
                type="poster"
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => handleOpenDetails(item as MediaItem)}
              />
            </div>
          )}

          {/* 5. Television Series */}
          {series.length > 0 && (
            <div id="series">
              <MediaCarousel
                title="Series"
                kicker="Episodic Television"
                subtitle="Complete seasons with automated intro/recap skip markers."
                items={series}
                type="poster"
                savedIds={myList}
                onToggleSave={handleToggleSave}
                onPlay={(item) => handleOpenDetails(item as MediaItem)}
              />
            </div>
          )}

          {/* 6. Dolby Atmos Audio Showcases */}
          {atmosItems.length > 0 && (
            <div id="music">
              <MediaCarousel
                title="Dolby Atmos Showcases"
                kicker="Spatial Acoustics"
                subtitle="Titles equipped with immersive multi-channel surround sound."
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
              />
            </div>
          )}

          {/* 7. My List */}
          <div id="my-list">
            {myListItems.length > 0 ? (
              <MediaCarousel
                title="My List"
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
              />
            ) : (
              <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
                <div className="mb-4">
                  <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                    Curated by {profile.name}
                  </span>
                  <h3 className="text-xl font-bold text-white">My List</h3>
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
