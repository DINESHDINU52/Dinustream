'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { HeroBanner } from '@/components/media/HeroBanner';
import { MediaDetailsSkeleton } from '@/components/media/MediaDetailsSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { mediaService } from '@/lib/services/mediaService';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { MediaItem, Season } from '@/types/cinema';
import { Play, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { myList, toggleMyList } = useActiveProfile();

  const [media, setMedia] = useState<MediaItem | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([mediaService.getMediaById(id), mediaService.getSeasonsForSeries(id)])
      .then(([m, s]) => {
        if (cancelled) return;
        setMedia(m);
        setSeasons(s);
        setActiveSeason(s[0]?.seasonNumber ?? 1);
        setError(m ? null : 'This series could not be found.');
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load this series from the media server.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
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
          <ErrorState title="Series not found" message={error || 'Unknown error'} onRetry={() => router.push('/')} />
        </div>
      </CinemaShell>
    );
  }

  const isSaved = myList.includes(media.id);
  const currentSeason = seasons.find((s) => s.seasonNumber === activeSeason) ?? seasons[0];
  const firstEpisodeId = currentSeason?.episodes?.[0]?.id;
  const playFirst = () => {
    if (firstEpisodeId) router.push(`/watch/${firstEpisodeId}`);
    else router.push(`/watch/${media.id}`);
  };

  return (
    <CinemaShell>
      <HeroBanner
        media={media}
        isSaved={isSaved}
        onPlay={playFirst}
        onToggleSave={() => toggleMyList(media.id)}
        onOpenDetails={() => document.getElementById('series-episodes')?.scrollIntoView({ behavior: 'smooth' })}
      />

      <div id="series-episodes" className="max-w-5xl mx-auto px-4 sm:px-8 lg:px-12 py-10 space-y-8 scroll-mt-navbar">
        {/* Season selector */}
        {seasons.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {seasons.map((s) => (
              <button
                key={s.seasonNumber}
                onClick={() => setActiveSeason(s.seasonNumber)}
                className={cn(
                  'shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-colors border',
                  s.seasonNumber === activeSeason
                    ? 'bg-white text-slate-950 border-white'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
                )}
              >
                {s.title}
              </button>
            ))}
          </div>
        )}

        {/* Episodes */}
        {currentSeason && (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <h2 className="text-lg font-bold text-white">{currentSeason.title}</h2>
              <span className="text-xs text-slate-500 font-mono">{currentSeason.episodeCount} episodes</span>
            </div>

            <div className="space-y-3">
              {(currentSeason.episodes ?? []).map((ep) => (
                <div
                  key={ep.id}
                  className="group flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 hover:bg-white/[0.06] transition-colors cursor-pointer"
                  onClick={() => router.push(`/watch/${ep.id}`)}
                >
                  <div className="w-28 sm:w-40 aspect-video rounded-lg overflow-hidden bg-[#0b1220] flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {ep.thumbnailUrl ? (
                      <img src={ep.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Play className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                      <span>E{ep.episodeNumber}</span>
                      {ep.runtime && (
                        <>
                          <span>•</span>
                          <span>{ep.runtime}</span>
                        </>
                      )}
                      {ep.progressMinutes && ep.totalMinutes ? (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">{Math.round((ep.progressMinutes / ep.totalMinutes) * 100)}% watched</span>
                        </>
                      ) : null}
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                      {ep.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 mt-0.5">{ep.overview}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/watch/${ep.id}`);
                    }}
                    className="hidden sm:inline-flex"
                  >
                    Play
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentSeason && (currentSeason.episodes?.length ?? 0) === 0 && (
          <p className="text-slate-500 text-sm">No episodes found for this season.</p>
        )}
      </div>
    </CinemaShell>
  );
}
