'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { HeroBanner } from '@/components/media/HeroBanner';
import { MediaDetailsSkeleton } from '@/components/media/MediaDetailsSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { mediaService } from '@/lib/services/mediaService';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { fetchItemFilename, isDolbyItem } from '@/lib/jellyfin/queries';
import { CacheStatus } from '@/components/sync/CacheStatus';
import { MediaItem } from '@/types/cinema';
import { Clapperboard, AudioLines, Languages, HardDriveDownload } from 'lucide-react';

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { myList, toggleMyList } = useActiveProfile();

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [isDolby, setIsDolby] = useState(false);
  const { status: cacheStatus, triggerSync, syncing } = useSyncStatus(filename);

  // Playback always goes through /watch, which owns the first-run experience:
  // it starts the Drive→SSD copy and, if the title isn't cached yet, plays a
  // random Dolby ad clip fully before handing over to the movie.
  const handlePlay = () => {
    router.push(`/watch/${media.id}`);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    mediaService
      .getMediaById(id)
      .then((m) => {
        if (cancelled) return;
        setMedia(m);
        setError(m ? null : 'This title could not be found.');
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load this title from the media server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Resolve the on-disk filename + whether this is a permanent Dolby NVMe title.
  useEffect(() => {
    let cancelled = false;
    setFilename(null);
    setIsDolby(false);
    (async () => {
      const [fn, dolby] = await Promise.all([
        fetchItemFilename(id).catch(() => null),
        isDolbyItem(id).catch(() => false),
      ]);
      if (cancelled) return;
      setFilename(fn);
      setIsDolby(dolby);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <CinemaShell>
        <MediaDetailsSkeleton />
      </CinemaShell>
    );
  }

  if (!media) {
    return (
      <CinemaShell>
        <div className="pt-navbar max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <ErrorState title="Title not found" message={error || 'Unknown error'} onRetry={() => router.push('/')} />
        </div>
      </CinemaShell>
    );
  }

  const isSaved = myList.includes(media.id);

  return (
    <CinemaShell>
      <HeroBanner
        media={media}
        isSaved={isSaved}
        onPlay={handlePlay}
        onToggleSave={() => toggleMyList(media.id)}
        onOpenDetails={() => document.getElementById('movie-details')?.scrollIntoView({ behavior: 'smooth' })}
      />

      <div id="movie-details" className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-8 scroll-mt-navbar">
        {/* Cache tier (Python Sync Manager: Google Drive -> local NVMe) */}
        {filename && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <CacheStatus state={isDolby ? 'ready' : cacheStatus?.state ?? 'not_cached'} />
              <span className="text-xs font-mono text-slate-500 truncate max-w-[240px] sm:max-w-md" title={filename}>
                {isDolby ? '◆ Permanent Dolby NVMe cache' : filename}
              </span>
            </div>
            <button
              onClick={() => void triggerSync()}
              disabled={syncing || isDolby || cacheStatus?.state === 'ready'}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>
                {isDolby
                  ? 'Dolby NVMe Cached'
                  : syncing
                    ? 'Syncing…'
                    : cacheStatus?.state === 'ready'
                      ? 'Cached on NVMe'
                      : 'Cache to SSD'}
              </span>
            </button>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          {/* Cast */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <Clapperboard className="w-4 h-4 text-sky-400" />
              Cast &amp; Crew
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {media.director && <span className="text-slate-200">Directed by {media.director}.</span>}{' '}
              {media.cast && media.cast.length > 0 ? `Starring ${media.cast.slice(0, 8).join(', ')}.` : ''}
            </p>
          </div>

          {/* Audio */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <AudioLines className="w-4 h-4 text-cyan-400" />
              Audio
            </div>
            <div className="flex flex-wrap gap-2">
              {(media.audioFormats ?? []).map((a) => (
                <Badge key={a} variant="silver" size="sm">
                  {a}
                </Badge>
              ))}
              {media.audioFormats?.length === 0 && <span className="text-slate-500 text-sm">—</span>}
            </div>
          </div>

          {/* Subtitles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
              <Languages className="w-4 h-4 text-rose-400" />
              Subtitles
            </div>
            <div className="flex flex-wrap gap-2">
              {(media.subtitleLanguages ?? []).map((s) => (
                <Badge key={s} variant="midnight" size="sm">
                  {s}
                </Badge>
              ))}
              {media.subtitleLanguages?.length === 0 && <span className="text-slate-500 text-sm">—</span>}
            </div>
          </div>
        </div>
      </div>
    </CinemaShell>
  );
}
