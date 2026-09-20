'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, SkipForward } from 'lucide-react';

export interface DolbyAtmosIntroProps {
  onComplete: () => void;
  durationSeconds?: number;
  autoPlaySound?: boolean;
}

export const DolbyAtmosIntro: React.FC<DolbyAtmosIntroProps> = ({
  onComplete,
  durationSeconds = 6,
  autoPlaySound = true,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(durationSeconds);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Synthesize rich, immersive cinematic bass thrum & spatial harmonics via Web Audio API
  const playCinematicSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const now = ctx.currentTime;

      // 1. Deep sub-bass sweep (45Hz -> 85Hz -> 50Hz)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(45, now);
      subOsc.frequency.exponentialRampToValueAtTime(85, now + 2.5);
      subOsc.frequency.exponentialRampToValueAtTime(50, now + 5.0);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.exponentialRampToValueAtTime(0.6, now + 1.8);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 5.5);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 5.8);

      // 2. Shimmering spatial chord (C-sharp minor cinema chord: C#4, E4, G#4, B4)
      const frequencies = [277.18, 329.63, 415.3, 493.88];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.3);

        gain.gain.setValueAtTime(0.001, now + idx * 0.3);
        gain.gain.exponentialRampToValueAtTime(0.08, now + idx * 0.3 + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 5.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.3);
        osc.stop(now + 5.5);
      });
    } catch {
      // Ignore browser autoplay audio policy rejections
    }
  }, []);

  useEffect(() => {
    if (autoPlaySound) {
      playCinematicSound();
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onComplete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [autoPlaySound, onComplete, playCinematicSound]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.8 } }}
      className="absolute inset-0 z-50 bg-[#030407] flex flex-col items-center justify-center select-none overflow-hidden"
      id="dolby-atmos-intro-overlay"
    >
      {/* Deep Spatial Background Glow & Particle Rings */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.25, 1.05],
            opacity: [0.15, 0.35, 0.2],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-sky-600/30 via-indigo-500/20 to-amber-500/25 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#030407_80%)]" />
      </div>

      {/* Top Bar Skip Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={onComplete}
          id="skip-dolby-intro-btn"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white text-xs font-mono tracking-wider transition-all backdrop-blur-md cinema-focus"
        >
          <span>SKIP PRELUDE</span>
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Cinematic Calibration Visual */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-xl space-y-6">
        {/* Spatial Audio Speaker Array Representation (7.1.4) */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="relative w-44 h-44 flex items-center justify-center"
        >
          {/* Pulsing acoustic resonance rings */}
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              initial={{ scale: 0.6, opacity: 0.8 }}
              animate={{
                scale: [0.6, 1.4 + ring * 0.2],
                opacity: [0.8, 0],
              }}
              transition={{
                duration: 2.4,
                repeat: Infinity,
                delay: ring * 0.7,
                ease: 'easeOut',
              }}
              className="absolute inset-0 rounded-full border border-sky-400/30"
            />
          ))}

          {/* Central Dolby Atmos Emblem */}
          <div className="relative z-10 w-24 h-24 rounded-2xl bg-[#090e1a] border border-white/20 shadow-[0_0_50px_rgba(56,189,248,0.35)] flex flex-col items-center justify-center p-2 backdrop-blur-xl">
            {/* Stylized Double-D Monogram */}
            <div className="flex items-center gap-0.5">
              <div className="w-6 h-9 rounded-r-lg border-y-2 border-r-2 border-white flex items-center justify-center font-bold text-xs">
                D
              </div>
              <div className="w-6 h-9 rounded-l-lg border-y-2 border-l-2 border-white flex items-center justify-center font-bold text-xs">
                D
              </div>
            </div>
            <span className="text-[8px] font-mono tracking-widest text-sky-400 uppercase mt-1 font-semibold">
              ATMOS
            </span>
          </div>
        </motion.div>

        {/* Cinematic Title & Calibration Typography */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 1.0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-sky-400" />
            <p className="text-[11px] font-mono tracking-[0.3em] uppercase text-sky-400 font-medium">
              Private Cinema Master
            </p>
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-sky-400" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase font-sans">
            DOLBY ATMOS
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 font-light tracking-wide max-w-md mx-auto">
            Discrete 7.1.4 Object-Based Immersive Audio.
            <br />
            Calibrated exclusively for <span className="text-white font-medium">Dinu</span> &{' '}
            <span className="text-white font-medium">Kanmani</span>.
          </p>
        </motion.div>

        {/* Feature Presentation Countdown Progress */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Feature presentation starting in {secondsRemaining}s</span>
          </div>

          <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: durationSeconds, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-sky-400 via-indigo-500 to-amber-400"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};
