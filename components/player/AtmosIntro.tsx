'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MediaItem } from '@/types/cinema';
import { SyncProgressData } from '@/types/sync';
import { AtmosClip, getNextRandomAtmosClip } from '@/lib/atmos-clips';
import { Headphones, SkipForward, HardDrive, CheckCircle2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AtmosIntroProps {
  movie?: MediaItem;
  syncProgress?: SyncProgressData;
  onReady: () => void;
  onSkip?: () => void;
  /** Duration in seconds to run mock sync if syncProgress is not passed (default 5.5s) */
  mockDurationSeconds?: number;
}

export const AtmosIntro: React.FC<AtmosIntroProps> = ({
  movie,
  syncProgress: externalSyncProgress,
  onReady,
  onSkip,
  mockDurationSeconds = 5.5,
}) => {
  // Randomly select one clip on mount; guarantee no consecutive repeat
  const [selectedClip] = useState<AtmosClip>(() => getNextRandomAtmosClip());
  const [videoSrc, setVideoSrc] = useState<string>(selectedClip.localPath);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasTriggeredReady, setHasTriggeredReady] = useState(false);

  // Internal mock progress state if external sync progress is not supplied
  const [internalProgress, setInternalProgress] = useState<number>(18);
  const [internalSpeed, setInternalSpeed] = useState<number>(142);
  const [internalEta, setInternalEta] = useState<number>(Math.round(mockDurationSeconds));

  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleFinish = useCallback(() => {
    if (hasTriggeredReady) return;
    setHasTriggeredReady(true);
    if (onSkip) {
      onSkip();
    } else {
      onReady();
    }
  }, [hasTriggeredReady, onSkip, onReady]);

  // Handle mock synchronization progress
  useEffect(() => {
    if (externalSyncProgress) return;

    const startTime = Date.now();
    const durationMs = mockDurationSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const fraction = Math.min(1, elapsed / durationMs);
      const pct = Math.round(18 + fraction * 82);

      setInternalProgress(pct);
      setInternalSpeed(Math.round(135 + Math.sin(fraction * Math.PI) * 28));
      setInternalEta(Math.max(0, Math.ceil((1 - fraction) * mockDurationSeconds)));

      if (fraction >= 1) {
        clearInterval(interval);
        setTimeout(() => {
          handleFinish();
        }, 500);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [externalSyncProgress, mockDurationSeconds, handleFinish]);

  // Fallback to online sample clip if local /atmos/*.mp4 is missing
  const handleVideoError = () => {
    if (videoSrc !== selectedClip.fallbackUrl) {
      setVideoSrc(selectedClip.fallbackUrl);
    }
  };

  const handleVideoEnded = () => {
    handleFinish();
  };

  // Compute active sync details (from external sync manager or internal mock)
  const currentProgress = useMemo(() => {
    if (externalSyncProgress) {
      return {
        percentage: externalSyncProgress.percentage,
        speedMbps: externalSyncProgress.speedMbps,
        etaSeconds: externalSyncProgress.etaSeconds,
        isReady: externalSyncProgress.percentage >= 100 || externalSyncProgress.status === 'ready',
      };
    }
    return {
      percentage: internalProgress,
      speedMbps: internalSpeed,
      etaSeconds: internalEta,
      isReady: internalProgress >= 100,
    };
  }, [externalSyncProgress, internalProgress, internalSpeed, internalEta]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
      className="absolute inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none"
      id="atmos-pre-play-system"
    >
      {/* Fullscreen Background Cinematic Video */}
      <div className="absolute inset-0 z-0">
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          muted={false}
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          onError={handleVideoError}
          onEnded={handleVideoEnded}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-700',
            isVideoLoaded ? 'opacity-85' : 'opacity-30'
          )}
        />
        {/* Cinematic Vignette & Shadow Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(3,5,10,0.85)_100%)]" />
      </div>

      {/* Top Header: Brand & Skip Button */}
      <div className="relative z-20 px-6 sm:px-10 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-mono tracking-widest uppercase backdrop-blur-md">
            <Volume2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>DOLBY ATMOS</span>
          </div>
          <span className="hidden sm:inline text-xs font-mono text-slate-400">
            {selectedClip.title}
          </span>
        </div>

        <button
          onClick={handleFinish}
          id="skip-atmos-intro-btn"
          className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 text-slate-200 hover:text-white text-xs font-mono font-medium tracking-wide transition-all backdrop-blur-md cinema-focus"
        >
          <span>SKIP INTRO</span>
          <SkipForward className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Center Cinematic Overlay Typography */}
      <div className="relative z-20 px-6 sm:px-12 text-center max-w-2xl mx-auto space-y-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="space-y-2.5"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-xl backdrop-blur-xl">
            <Headphones className="w-4 h-4 text-sky-400 animate-bounce" />
            <span className="text-xs sm:text-sm font-semibold text-white tracking-widest uppercase font-mono">
              DOLBY ATMOS EXPERIENCE
            </span>
          </div>

          <p className="text-sm sm:text-base text-slate-300 font-light max-w-lg mx-auto leading-relaxed drop-shadow-md">
            &ldquo;For the best experience, use headphones or a compatible sound system.&rdquo;
          </p>
        </motion.div>
      </div>

      {/* Bottom Syncing Status Card & Progress */}
      <div className="relative z-20 px-6 sm:px-10 pb-8 sm:pb-10 max-w-xl mx-auto w-full">
        <motion.div
          initial={{ y: 25, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="p-4 sm:p-5 rounded-2xl bg-[#090e1a]/90 border border-slate-400/[0.18] shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl space-y-3"
          id="syncing-movie-card"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs sm:text-sm font-semibold text-white font-mono">
                {currentProgress.isReady
                  ? 'Ready for Presentation'
                  : `Syncing ${movie ? `"${movie.title}"` : 'Movie'}...`}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs">
              {currentProgress.isReady ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Synchronized
                </span>
              ) : (
                <span className="text-sky-400 font-semibold">{currentProgress.percentage}%</span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400 rounded-full"
              style={{ width: `${currentProgress.percentage}%` }}
              transition={{ ease: 'easeOut', duration: 0.2 }}
            />
          </div>

          {/* Metrics Row: Progress, Speed, ETA */}
          <div className="grid grid-cols-3 pt-1 text-[11px] font-mono text-slate-400">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Progress</span>
              <span className="text-slate-200 font-semibold">{currentProgress.percentage}%</span>
            </div>
            <div className="text-center">
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">Speed</span>
              <span className="text-slate-200 font-semibold">{currentProgress.speedMbps} MB/s</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[10px] uppercase tracking-wider">ETA</span>
              <span className="text-slate-200 font-semibold">
                {currentProgress.isReady ? '0s' : `${currentProgress.etaSeconds}s`}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
