'use client';

// A random clip from the Dolby ad folder, used as the cinematic backdrop while
// a title is prepared / buffered. Muted + non-interactive so it can sit behind
// a spinner without stealing focus or audio.
//
// `loop` defaults to true for ambient backdrops (player buffering). Pass
// loop={false} + onEnded for the first-run ad, which must play *fully* once.
//
// If the Dolby folder is unavailable (or the clip errors) it degrades to the
// supplied poster, then to plain black.

import React, { useEffect, useState } from 'react';
import { fetchRandomDolbyAd } from '@/lib/jellyfin/queries';
import { cn } from '@/lib/utils';

export interface DolbyBumperProps {
  /** Full-bleed wrapper classes (opacity, blend, etc.). */
  className?: string;
  /** Artwork shown until the clip is resolvable / if it errors. */
  poster?: string;
  /** Loop the clip (ambient backdrop). Set false for the one-shot ad. */
  loop?: boolean;
  /** Fired when a non-looping clip reaches its end. */
  onEnded?: () => void;
  /** Fired when the clip element fails to load (so callers can move on). */
  onError?: () => void;
}

export function DolbyBumper({
  className,
  poster,
  loop = true,
  onEnded,
  onError,
}: DolbyBumperProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchRandomDolbyAd()
      .then((ad) => {
        if (!cancelled && ad) {
          setUrl(`/jellyfin/Videos/${ad.itemId}/stream?Static=true`);
        }
      })
      .catch(() => {
        /* fall back to the poster below */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleError = () => {
    setFailed(true);
    onError?.();
  };

  if (url && !failed) {
    return (
      <video
        src={url}
        autoPlay
        muted
        loop={loop}
        playsInline
        preload="auto"
        onError={handleError}
        onEnded={onEnded}
        className={cn('absolute inset-0 h-full w-full object-cover', className)}
      />
    );
  }

  if (poster) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={poster}
        alt=""
        className={cn('absolute inset-0 h-full w-full object-cover', className)}
      />
    );
  }

  return <div className={cn('absolute inset-0 bg-black', className)} />;
}
