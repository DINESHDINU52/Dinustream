'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { HeroBanner } from '@/components/media/HeroBanner';
import { MediaCarousel } from '@/components/media/MediaCarousel';
import { DesignSystemShowcase } from '@/components/design-system/DesignSystemShowcase';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import {
  FEATURED_HERO_MEDIA,
  MOCK_CONTINUE_WATCHING,
  MOCK_TRENDING,
  MOCK_RECENTLY_ADDED,
  MOCK_MOVIES,
  MOCK_SERIES,
  MOCK_DOLBY_ATMOS,
} from '@/lib/mock-data';
import { MediaItem } from '@/types/cinema';
import { SyncAndPlayButton } from '@/components/sync';
import {
  Film,
  Layers,
  Play,
  Zap,
} from 'lucide-react';

export default function CinemaHomePage() {
  const router = useRouter();
  const { profile, companionProfile, continueWatching, myList, toggleMyList } = useActiveProfile();
  const [activeTab, setActiveTab] = useState<'cinema' | 'design-system'>('cinema');
  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);

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

  // Compile My List items from all mock collections based on savedIds
  const allMediaItems = useMemo(() => {
    const map = new Map<string, MediaItem>();
    [
      FEATURED_HERO_MEDIA,
      ...MOCK_TRENDING,
      ...MOCK_RECENTLY_ADDED,
      ...MOCK_MOVIES,
      ...MOCK_SERIES,
      ...MOCK_DOLBY_ATMOS,
    ].forEach((item) => map.set(item.id, item));
    return map;
  }, []);

  const myListItems = useMemo(() => {
    return myList
      .map((id) => allMediaItems.get(id))
      .filter((item): item is MediaItem => Boolean(item));
  }, [myList, allMediaItems]);

  const activeHeroMedia = selectedMedia || FEATURED_HERO_MEDIA;

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
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        kicker="Feature Details"
        title={activeHeroMedia.title}
        description={`${activeHeroMedia.releaseYear} • ${activeHeroMedia.runtime} • ${activeHeroMedia.rating} • ${activeHeroMedia.genres.join(', ')}`}
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
              media={activeHeroMedia}
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
                router.push(`/watch/${activeHeroMedia.id}`);
              }}
            >
              Play
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed font-light">
            {activeHeroMedia.overview}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-[#0d1421] border border-white/[0.06]">
              <p className="text-[10px] font-mono uppercase text-slate-400">Audio Format</p>
              <p className="text-xs font-medium text-white mt-0.5">Dolby Atmos Bitstream 7.1.4</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0d1421] border border-white/[0.06]">
              <p className="text-[10px] font-mono uppercase text-slate-400">Visual Quality</p>
              <p className="text-xs font-medium text-white mt-0.5">4K Ultra HD • Dolby Vision</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {activeHeroMedia.badges.map((b) => (
              <Badge key={b} variant="midnight" size="sm">
                {b}
              </Badge>
            ))}
            <Badge variant="silver" size="sm">
              Subtitles [CC]
            </Badge>
          </div>
        </div>
      </Modal>

      {/* Synchronized Watch Room Drawer */}
      <Drawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        kicker="Synchronized Room"
        title="Watch Together"
      >
        <div className="space-y-5">
          <div className="p-3.5 rounded-lg bg-[#111927] border border-slate-400/[0.12] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Screening Room Active</span>
              <Badge variant="sync" size="sm">Connected</Badge>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Avatar profile={profile} size="sm" />
                <span className="text-xs text-slate-200">{profile.name} (Host)</span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar profile={companionProfile} size="sm" />
                <span className="text-xs text-slate-200">{companionProfile.name}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-light">
            Playback is synchronized in lockstep with drift correction below 100ms.
          </p>

          <div className="space-y-2">
            <p className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
              Quick Launch Sync Stream
            </p>
            {[
              FEATURED_HERO_MEDIA,
              MOCK_CONTINUE_WATCHING[0],
              MOCK_TRENDING[0],
            ].map((media) => (
              <div
                key={media.id}
                className="p-3 rounded-lg bg-[#0d1421] border border-white/[0.06] flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-medium text-white">{media.title}</p>
                  <p className="text-[10px] text-slate-400">{media.runtime} • {media.rating}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Zap className="w-3 h-3 text-sky-400 fill-sky-400" />}
                  onClick={() => {
                    setIsSyncDrawerOpen(false);
                    notify(`Streaming "${media.title}" in sync with ${companionProfile.name}`);
                  }}
                >
                  Sync
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Drawer>

      {/* Floating Viewport Mode Selector (Cinema vs Design System) */}
      <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-30">
        <GlassPanel
          variant="standard"
          padding="none"
          className="p-1.5 flex items-center gap-1 shadow-[0_12px_36px_rgba(0,0,0,0.85)] border-slate-400/[0.18]"
        >
          <button
            onClick={() => setActiveTab('cinema')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cinema-focus ${
              activeTab === 'cinema'
                ? 'bg-white text-[#070a10] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Cinema View</span>
          </button>
          <button
            onClick={() => setActiveTab('design-system')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cinema-focus ${
              activeTab === 'design-system'
                ? 'bg-white text-[#070a10] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Design System</span>
          </button>
        </GlassPanel>
      </div>

      {activeTab === 'cinema' ? (
        <div className="space-y-10 sm:space-y-14 md:space-y-16 pb-16">
          {/* 1. Large Cinematic Hero Section */}
          <HeroBanner
            media={FEATURED_HERO_MEDIA}
            isSaved={myList.includes(FEATURED_HERO_MEDIA.id)}
            onPlay={() => router.push(`/watch/${FEATURED_HERO_MEDIA.id}`)}
            onSyncPlay={() => {
              notify(`Sync room invited: ${companionProfile.name}`);
              setIsSyncDrawerOpen(true);
            }}
            onToggleSave={() => handleToggleSave(FEATURED_HERO_MEDIA)}
            onOpenDetails={() => handleOpenDetails(FEATURED_HERO_MEDIA)}
          />

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
                    <Badge variant="midnight" size="sm">Private</Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-light mt-0.5">
                    {profile.statusMessage} • Companion {companionProfile.name} is online
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
                  <span>SSD Cache 100%</span>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* 2. Continue Watching (Netflix-style horizontal carousel) */}
          <MediaCarousel
            title="Continue Watching"
            kicker={`Resume for ${profile.name}`}
            subtitle={`Pick up right where ${profile.name} left off with frame-accurate sync.`}
            items={continueWatching.length > 0 ? continueWatching : MOCK_CONTINUE_WATCHING}
            type="continue"
            onPlay={(item) => router.push(`/watch/${item.id}`)}
          />

          {/* 3. Trending */}
          <MediaCarousel
            title="Trending"
            kicker="Current Buzz"
            subtitle="The most-watched releases across your private catalog."
            items={MOCK_TRENDING}
            type="poster"
            savedIds={myList}
            onToggleSave={handleToggleSave}
            onPlay={(item) => handleOpenDetails(item as MediaItem)}
          />

          {/* 4. Recently Added */}
          <MediaCarousel
            title="Recently Added"
            kicker="New Vault Arrivals"
            subtitle="Freshly indexed masters synced directly to local SSD cache."
            items={MOCK_RECENTLY_ADDED}
            type="poster"
            savedIds={myList}
            onToggleSave={handleToggleSave}
            onPlay={(item) => handleOpenDetails(item as MediaItem)}
          />

          {/* 5. Movies */}
          <div id="movies">
            <MediaCarousel
              title="Movies"
              kicker="Feature Presentations"
              subtitle="Uncut theatrical and IMAX enhanced editions in native 4K."
              items={MOCK_MOVIES}
              type="poster"
              savedIds={myList}
              onToggleSave={handleToggleSave}
              onPlay={(item) => handleOpenDetails(item as MediaItem)}
            />
          </div>

          {/* 6. Series */}
          <div id="series">
            <MediaCarousel
              title="Series"
              kicker="Episodic Television"
              subtitle="Complete seasons with automated intro/recap skip markers."
              items={MOCK_SERIES}
              type="poster"
              savedIds={myList}
              onToggleSave={handleToggleSave}
              onPlay={(item) => handleOpenDetails(item as MediaItem)}
            />
          </div>

          {/* 7. Dolby Atmos Audio Showcases */}
          <div id="music">
            <MediaCarousel
              title="Dolby Atmos Showcases"
              kicker="Spatial Acoustics"
              subtitle="Films specifically chosen for reference spatial sound and deep infrasonic bass."
              items={MOCK_DOLBY_ATMOS}
              type="backdrop"
              savedIds={myList}
              action={
                <Badge variant="atmos" size="sm">
                  Spatial Audio Reference
                </Badge>
              }
              onToggleSave={handleToggleSave}
              onPlay={(item) => handleOpenDetails(item as MediaItem)}
            />
          </div>

          {/* 8. My List */}
          <div id="my-list">
            <MediaCarousel
              title="My List"
              kicker={`Curated by ${profile.name}`}
              subtitle={
                myListItems.length > 0
                  ? `Your private watchlist with ${myListItems.length} titles saved.`
                  : `Your watchlist is empty. Click "＋ My List" on any title to save it here.`
              }
              items={myListItems.length > 0 ? myListItems : MOCK_TRENDING.slice(0, 3)}
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
          </div>
        </div>
      ) : (
        /* Design System Token Showcase View */
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-24">
          <DesignSystemShowcase />
        </div>
      )}
    </CinemaShell>
  );
}
