'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Drawer } from '@/components/ui/Drawer';
import { Toast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { MediaCard } from '@/components/ui/MediaCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { mediaService } from '@/lib/services/mediaService';
import { MediaItem } from '@/types/cinema';
import { SyncAndPlayButton } from '@/components/sync';
import {
  Play,
  Plus,
  Check,
  Film,
  ArrowLeft,
  Volume2,
  Subtitles,
  Sparkles,
} from 'lucide-react';

export default function MovieDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { profile, companionProfile, myList, toggleMyList } = useActiveProfile();

  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [similarMovies, setSimilarMovies] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; subtext?: string } | null>(null);
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    mediaService
      .getMediaById(id)
      .then(async (m) => {
        if (!m) {
          setError('Movie not found in your private vault');
          setLoading(false);
          return;
        }
        setMedia(m);

        // Fetch similar movies from Jellyfin
        const allMovies = await mediaService.getMovies(20).catch(() => []);
        const similar = allMovies
          .filter((item) => item.id !== m.id)
          .slice(0, 6);
        setSimilarMovies(similar);
      })
      .catch((err) => {
        console.error('[MovieDetailsPage] Failed to fetch movie:', err);
        setError('Unable to load movie details from server');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const isSaved = media ? myList.includes(media.id) : false;

  const notify = (message: string, subtext?: string) => {
    setToastInfo({ message, subtext });
    setTimeout(() => setToastInfo(null), 3500);
  };

  const handleToggleSave = () => {
    if (!media) return;
    const added = toggleMyList(media.id);
    notify(
      added ? `Added "${media.title}" to ${profile.name}'s List` : `Removed "${media.title}" from My List`,
      'Updated private screening list'
    );
  };

  if (loading) {
    return (
      <CinemaShell>
        <div className="min-h-[80vh] flex flex-col justify-center items-center gap-4">
          <div className="w-10 h-10 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono tracking-wider uppercase">
            Loading movie presentation...
          </p>
        </div>
      </CinemaShell>
    );
  }

  if (error || !media) {
    return (
      <CinemaShell>
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <ErrorState
            title="Feature Unavailable"
            message={error || 'This title could not be found.'}
            onRetry={() => router.push('/')}
          />
          <div className="mt-6">
            <Button
              variant="secondary"
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => router.push('/')}
            >
              Return to Cinema Hall
            </Button>
          </div>
        </div>
      </CinemaShell>
    );
  }

  return (
    <CinemaShell>
      {/* Toast Notification */}
      <Toast
        message={toastInfo?.message || ''}
        subtext={toastInfo?.subtext}
        type="sync"
        isVisible={Boolean(toastInfo)}
        onDismiss={() => setToastInfo(null)}
      />

      {/* Synchronized Screening Room Drawer */}
      <Drawer
        isOpen={isSyncDrawerOpen}
        onClose={() => setIsSyncDrawerOpen(false)}
        kicker="Private Screening Room"
        title="Sync & Play Together"
      >
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-[#0b101b] border border-slate-700/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Live Session Ready</span>
              <Badge variant="sync" size="sm">Sub-100ms Sync</Badge>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <Avatar profile={profile} size="sm" />
                <div>
                  <p className="text-xs font-medium text-slate-200">{profile.name}</p>
                  <p className="text-[10px] text-cyan-400">Host</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Avatar profile={companionProfile} size="sm" />
                <div>
                  <p className="text-xs font-medium text-slate-200">{companionProfile.name}</p>
                  <p className="text-[10px] text-rose-400">Companion</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 font-light leading-relaxed">
            Clicking Launch will start playback on both screens simultaneously, syncing play, pause, and seek events with drift correction.
          </p>

          <Button
            variant="primary"
            className="w-full justify-center"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => {
              setIsSyncDrawerOpen(false);
              router.push(`/watch/${media.id}?sync=true`);
            }}
          >
            Launch Synchronized Stream
          </Button>
        </div>
      </Drawer>

      <div className="relative min-h-screen pb-20">
        {/* Back Button (Positioned below fixed CinemaNavbar with z-50 for instant clickability) */}
        <div className="absolute top-20 sm:top-24 left-4 sm:left-8 lg:left-12 z-50">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#080d17]/90 hover:bg-[#121c2f] border border-white/[0.15] text-xs font-medium text-slate-200 hover:text-white backdrop-blur-2xl transition-all shadow-[0_4px_24px_rgba(0,0,0,0.7)] cinema-focus cursor-pointer select-none active:scale-95 group"
            aria-label="Back to Catalog"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
        </div>

        {/* Hero Backdrop Presentation */}
        <div className="relative w-full h-[65vh] sm:h-[75vh] max-h-[800px] overflow-hidden">
          <img
            src={media.backdropUrl || media.posterUrl}
            alt={media.title}
            className="w-full h-full object-cover object-center filter brightness-[0.75]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070c] via-[#05070c]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#05070c] via-[#05070c]/40 to-transparent" />

          {/* Hero Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pb-12 z-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-3xl space-y-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="midnight" size="sm">
                  {media.releaseYear}
                </Badge>
                <Badge variant="midnight" size="sm">
                  {media.runtime}
                </Badge>
                {media.rating && (
                  <Badge variant="midnight" size="sm">
                    {media.rating}
                  </Badge>
                )}
                {media.badges.map((b) => (
                  <Badge key={b} variant={b === 'Dolby Atmos' ? 'atmos' : 'silver'} size="sm">
                    {b}
                  </Badge>
                ))}
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                {media.title}
              </h1>

              {media.tagline && (
                <p className="text-sm sm:text-base font-medium text-cyan-400/90 tracking-wide italic">
                  &ldquo;{media.tagline}&rdquo;
                </p>
              )}

              <p className="text-sm sm:text-base text-slate-300 font-light leading-relaxed max-w-2xl line-clamp-3 sm:line-clamp-none">
                {media.overview}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Button
                  variant="silver"
                  size="md"
                  icon={<Play className="w-4 h-4 fill-current" />}
                  onClick={() => router.push(`/watch/${media.id}`)}
                >
                  Play Feature
                </Button>

                <SyncAndPlayButton
                  media={media}
                  variant="primary"
                  size="md"
                  isGroupMode={true}
                  onBeforeSync={() => setIsSyncDrawerOpen(true)}
                />

                <Button
                  variant="secondary"
                  size="md"
                  icon={isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4" />}
                  onClick={handleToggleSave}
                >
                  {isSaved ? 'In My List' : 'Add to List'}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Technical Specs & Details Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 mt-8 space-y-12">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <GlassPanel variant="standard" padding="md" className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Audio Streams</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {media.audioFormats && media.audioFormats.length > 0 ? media.audioFormats.join(' • ') : 'Stereo / Surround Sound'}
              </p>
              <p className="text-xs text-slate-400">
                Direct streamed bitstream without lossy downmixing.
              </p>
            </GlassPanel>

            <GlassPanel variant="standard" padding="md" className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider">
                <Subtitles className="w-4 h-4 text-rose-400" />
                <span>Subtitle Tracks</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {media.subtitleLanguages && media.subtitleLanguages.length > 0 ? media.subtitleLanguages.join(' • ') : 'Subtitles Available'}
              </p>
              <p className="text-xs text-slate-400">
                Synchronized subtitle tracks embedded in container.
              </p>
            </GlassPanel>

            <GlassPanel variant="standard" padding="md" className="space-y-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-wider">
                <Film className="w-4 h-4 text-amber-400" />
                <span>Genres & Cast</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {media.genres.join(', ') || 'Feature Cinema'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {media.cast && media.cast.length > 0 ? `Starring: ${media.cast.join(', ')}` : 'Private vault selection'}
              </p>
            </GlassPanel>
          </div>

          {/* Similar Movies Section */}
          {similarMovies.length > 0 && (
            <div className="space-y-4">
              <SectionHeader
                title="More Titles from the Vault"
                kicker="Recommended Presentations"
                subtitle="Curated companion features with matching cinematic attributes."
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {similarMovies.map((item) => (
                  <MediaCard
                    key={item.id}
                    media={item}
                    aspectRatio="poster"
                    isSaved={myList.includes(item.id)}
                    onToggleSave={() => {
                      const added = toggleMyList(item.id);
                      notify(
                        added ? `Added "${item.title}" to My List` : `Removed "${item.title}" from My List`
                      );
                    }}
                    onPlay={() => router.push(`/movie/${item.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CinemaShell>
  );
}
