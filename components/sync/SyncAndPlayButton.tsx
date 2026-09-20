'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MediaItem } from '@/types/cinema';
import { syncMovie, getSyncStatus } from '@/lib/api/syncManager';
import { SyncOverlay } from './SyncOverlay';
import { Zap, Loader2 } from 'lucide-react';
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

export const SyncAndPlayButton: React.FC<SyncAndPlayButtonProps> = ({
  media,
  variant = 'primary',
  size = 'md',
  isGroupMode = false,
  className,
  onBeforeSync,
}) => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncOverlayOpen, setIsSyncOverlayOpen] = useState(false);

  // Derive standard high-bitrate media filename from media id
  const filename = `${media.id}.mkv`;

  const handleClick = async () => {
    onBeforeSync?.();
    setIsChecking(true);

    try {
      // 1. Check if movie is already cached on Oracle NVMe SSD
      const currentStatus = await getSyncStatus(filename);

      if (currentStatus.state === 'ready' || currentStatus.percentage >= 100) {
        // Movie is cached: play immediately!
        setIsChecking(false);
        navigateToWatch();
        return;
      }

      // 2. Movie is not cached: start sync and launch Atmos overlay
      await syncMovie({
        movieId: media.id,
        filename,
        title: media.title,
      });

      setIsChecking(false);
      setIsSyncOverlayOpen(true);
    } catch {
      // If check fails or network error, open overlay to attempt resilience sync
      setIsChecking(false);
      setIsSyncOverlayOpen(true);
    }
  };

  const navigateToWatch = () => {
    if (isGroupMode) {
      router.push(`/watch/${media.id}?sync=true&group=dinu-kanmani`);
    } else {
      router.push(`/watch/${media.id}?sync=true`);
    }
  };

  const handleSyncReady = () => {
    setIsSyncOverlayOpen(false);
    navigateToWatch();
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isChecking}
        id={`sync-and-play-btn-${media.id}`}
        icon={
          isChecking ? (
            <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
          ) : (
            <Zap className="w-4 h-4 text-sky-400 fill-sky-400" />
          )
        }
        className={cn('relative', className)}
      >
        <span>{isChecking ? 'Checking Cache...' : 'Sync & Play'}</span>
      </Button>

      {/* Sync Overlay with Atmos Experience */}
      <SyncOverlay
        movie={media}
        filename={filename}
        isOpen={isSyncOverlayOpen}
        onClose={() => setIsSyncOverlayOpen(false)}
        onReady={handleSyncReady}
        isGroupMode={isGroupMode}
      />
    </>
  );
};
