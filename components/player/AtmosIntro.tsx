'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { SyncProgressData } from '@/types/sync';
import {
  AtmosClip,
  FALLBACK_ATMOS_CLIPS,
  fetchHostedDolbyClips,
  getNextRandomAtmosClip,
} from '@/lib/atmos-clips';
import { SkipForward, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AtmosIntroProps {
  movie?: MediaItem;
  syncProgress?: SyncProgressData;
  onReady: () => void;
  onSkip?: () => void;
  mockDurationSeconds?: number;
}

export const AtmosIntro: React.FC<AtmosIntroProps> = ({
  movie,
  syncProgress: externalSyncProgress,
  onReady,
  onSkip,
}) => {
  // Start with a fallback clip immediately to prevent delay, then load server hosted clips
  const [selectedClip, setSelectedClip] = useState<AtmosClip>(() =>
    getNextRandomAtmosClip(FALLBACK_ATMOS_CLIPS)
  );
  const [videoSrc, setVideoSrc] = useState<string>(selectedClip.localPath);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasTriggeredReady, setHasTriggeredReady] = useState(false);

  // Sync Progress state driven by the video duration or external sync
  const [progressPct, setProgressPct] = useState<number>(0);
  const [isSyncComplete, setIsSyncComplete] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFinish = useCallback(() => {
    if (hasTriggeredReady) return;
    setHasTriggeredReady(true);
    if (onSkip) {
      onSkip();
    } else {
      onReady();
    }
  }, [hasTriggeredReady, onSkip, onReady]);

  // 1. Check if custom server-hosted SSD clips exist in /opt/dinustream/cache/dolby
  useEffect(() => {
    let isMounted = true;
    fetchHostedDolbyClips().then((hostedClips) => {
      if (!isMounted) return;
      // Only override if actual custom server clips exist (isHosted === true)
      if (hostedClips && hostedClips.length > 0 && hostedClips[0].isHosted) {
        const nextClip = getNextRandomAtmosClip(hostedClips);
        setSelectedClip(nextClip);
        setVideoSrc(nextClip.localPath);
      }
    });

    // Safety timeout: ensure intro never takes too long and site never feels laggy
    const safetyTimeout = setTimeout(() => {
      if (!isSyncComplete) {
        setIsSyncComplete(true);
        setProgressPct(100);
        setTimeout(() => {
          handleFinish();
        }, 300);
      }
    }, 7000);

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, [handleFinish, isSyncComplete]);

  // 2. Drive the sync progress bar seamlessly matching the video playback
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const current = video.currentTime;
    const duration = video.duration;
    const fraction = Math.min(1, current / duration);
    const pct = Math.min(100, Math.round(fraction * 100));

    setProgressPct(pct);

    if (fraction >= 0.98) {
      setIsSyncComplete(true);
    }
  };

  // 3. Complete strictly when video finishes playing fully (or skip clicked)
  const handleVideoEnded = () => {
    setIsSyncComplete(true);
    setProgressPct(100);
    setTimeout(() => {
      handleFinish();
    }, 400);
  };

  const handleVideoError = () => {
    if (videoSrc !== selectedClip.fallbackUrl) {
      setVideoSrc(selectedClip.fallbackUrl);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="absolute inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none"
      id="atmos-pre-play-system"
    >
      {/* Fullscreen Cinematic Spatial Video Background (No obtrusive Dolby text overlay) */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          preload="auto"
          muted={false}
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          onTimeUpdate={handleTimeUpdate}
          onError={handleVideoError}
          onEnded={handleVideoEnded}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-700',
            isVideoLoaded ? 'opacity-95' : 'opacity-20'
          )}
        />
        {/* Subtle Vignette Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030611]/80 via-transparent to-[#030611]/60" />
      </div>

      {/* Top Header: Clean Minimal Skip Button in Corner */}
      <div className="relative z-20 px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-end">
        <button
          onClick={handleFinish}
          id="skip-atmos-intro-btn"
          className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/[0.15] text-slate-300 hover:text-white text-xs font-medium tracking-wide transition-all backdrop-blur-2xl cinema-focus shadow-lg"
        >
          <span>Skip</span>
          <SkipForward className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Cute Minimal Liquid Glass Sync Indicator Capsule */}
      <div className="relative z-30 pb-8 sm:pb-12 flex justify-center px-4 pointer-events-none">
        <motion.div
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="pointer-events-auto flex items-center gap-3.5 px-5 py-2.5 rounded-full bg-white/[0.07] hover:bg-white/[0.12] backdrop-blur-3xl border border-white/[0.18] shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all select-none"
          id="syncing-movie-card"
        >
          {/* Liquid Pulse Glowing Orb */}
          <div className="relative flex items-center justify-center w-3.5 h-3.5">
            <span className="absolute inset-0 rounded-full bg-cyan-400/40 animate-ping" />
            <span className="relative w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
          </div>

          {/* Minimal Cute Label */}
          <span className="text-xs font-medium text-slate-200 tracking-wide">
            {isSyncComplete ? (
              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Ready to Play
              </span>
            ) : (
              <span>Syncing • {progressPct}%</span>
            )}
          </span>

          {/* Delicate Fluid Progress Line */}
          <div className="w-16 sm:w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 rounded-full"
              style={{ width: `${progressPct}%` }}
              transition={{ ease: 'easeOut', duration: 0.2 }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
