'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MediaItem } from '@/types/cinema';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface SyncAndPlayButtonProps {
  media: MediaItem;
  variant?: 'primary' | 'secondary' | 'silver';
  size?: 'sm' | 'md' | 'lg';
  isGroupMode?: boolean;
  className?: string;
  onBeforeSync?: () => void;
}

/**
 * "Sync & Play" — start a synchronized Watch Together session.
 *
 * WHAT CHANGED AND WHY
 * --------------------
 * This used to gate playback behind a cache-copy step: POST /api/sync/movie,
 * then poll /api/sync/status until it reported `ready`, showing a progress
 * overlay the whole time. Three things were wrong with that:
 *
 *  1. The Sync Manager backend is not running. `/api/sync/health` reports
 *     `{"status":"offline", "fallbackMode":true}`, so every request fell through
 *     to an in-memory simulation.
 *  2. That simulation kept its job registry in a module-level `Map` that the
 *     POST route exported and the GET route imported. Across separate route
 *     module instances — which is what you get in a production server, unlike a
 *     single dev process — the status route reads a *different, empty* Map, finds
 *     no job, and answers `state: 'not_cached', percentage: 0`. Forever. That is
 *     the 0% hang.
 *  3. It was gating the wrong thing anyway. Playback streams straight from
 *     Jellyfin over HLS now, so there is nothing to wait for — copying the file
 *     to a local SSD is a server-side performance optimisation, not a
 *     precondition for watching.
 *
 * So the button does what its name says: it goes to synchronized playback
 * immediately. No progress bar, nothing to get stuck at 0%.
 */
export const SyncAndPlayButton: React.FC<SyncAndPlayButtonProps> = ({
  media,
  variant = 'primary',
  size = 'md',
  isGroupMode = false,
  className,
  onBeforeSync,
}) => {
  const router = useRouter();

  const handleClick = () => {
    // Retained so callers can still open their own "screening room" drawer.
    onBeforeSync?.();

    const query = new URLSearchParams();
    if (isGroupMode) {
      const uniqueRoom = `cinema-${Math.random().toString(36).substring(2, 8)}`;
      query.set('room', uniqueRoom);
    }
    const qStr = query.toString();
    router.push(`/watch/${media.id}${qStr ? `?${qStr}` : ''}`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      id={`sync-and-play-btn-${media.id}`}
      icon={<Zap className="w-4 h-4 text-sky-400 fill-sky-400" />}
      className={cn('relative', className)}
    >
      <span>Sync &amp; Play</span>
    </Button>
  );
};
