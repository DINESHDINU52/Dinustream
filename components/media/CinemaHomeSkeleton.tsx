'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

const GUTTER = 'px-4 sm:px-8 lg:px-12';

export const CinemaHomeSkeleton: React.FC = () => {
  return (
    <div className="space-y-8 sm:space-y-12 md:space-y-14 pb-16 animate-in fade-in duration-300">
      {/* 1. Cinematic Hero Banner Skeleton */}
      <div className="relative w-full h-[65vh] sm:h-[72vh] md:h-[80vh] bg-gradient-to-b from-[#090d18] via-[#060a12] to-[#04070e] overflow-hidden border-b border-white/[0.06]">
        {/* Subtle Ambient Shimmer Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(56,189,248,0.06),transparent)] pointer-events-none" />
        
        {/* Top Vignette & Left Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#04070e] via-[#04070e]/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04070e] via-transparent to-transparent z-10" />

        {/* Hero Content Elements */}
        <div className={cn('relative z-20 h-full max-w-7xl mx-auto flex flex-col justify-end pb-12 sm:pb-16 md:pb-20', GUTTER)}>
          <div className="max-w-2xl space-y-4 sm:space-y-5">
            {/* Top Badges Pill Row */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full bg-white/[0.07]" />
              <Skeleton className="h-6 w-20 rounded-full bg-white/[0.06]" />
              <Skeleton className="h-6 w-16 rounded-full bg-white/[0.06]" />
            </div>

            {/* Giant Title Placeholder */}
            <div className="space-y-2">
              <Skeleton className="h-10 sm:h-14 md:h-16 w-11/12 max-w-xl rounded-2xl bg-white/[0.08]" />
              <Skeleton className="h-5 w-48 rounded-lg bg-white/[0.05]" />
            </div>

            {/* Overview paragraph */}
            <div className="space-y-2 max-w-lg pt-1">
              <Skeleton className="h-4 w-full rounded bg-white/[0.05]" />
              <Skeleton className="h-4 w-5/6 rounded bg-white/[0.04]" />
              <Skeleton className="h-4 w-3/4 rounded bg-white/[0.04]" />
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-3 pt-3">
              <Skeleton className="h-11 sm:h-12 w-32 sm:w-36 rounded-xl bg-amber-500/20 border-amber-500/30" />
              <Skeleton className="h-11 sm:h-12 w-11 sm:w-12 rounded-xl bg-white/[0.06]" />
              <Skeleton className="h-11 sm:h-12 w-11 sm:w-12 rounded-xl bg-white/[0.06]" />
            </div>
          </div>
        </div>

        {/* Slide Indicator Dots on Bottom Right */}
        <div className={cn('absolute bottom-6 right-0 z-20 hidden sm:flex items-center gap-2', GUTTER)}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className={cn('h-1.5 rounded-full bg-white/[0.08]', i === 0 ? 'w-8 bg-sky-400/40' : 'w-2')} />
          ))}
        </div>
      </div>

      {/* 2. Category Chip Bar Skeleton */}
      <div className="max-w-7xl mx-auto pt-2 sm:pt-4">
        <div className={cn('flex items-center gap-2 overflow-x-auto no-scrollbar py-2', GUTTER)}>
          {[...Array(7)].map((_, i) => (
            <Skeleton
              key={i}
              className={cn(
                'h-9 rounded-full shrink-0 bg-white/[0.04] border border-white/[0.06]',
                i === 0 ? 'w-28 bg-white/[0.1]' : i === 1 ? 'w-32' : 'w-24'
              )}
            />
          ))}
          <Skeleton className="h-9 w-28 rounded-full shrink-0 ml-auto bg-sky-500/10 border-sky-500/20" />
        </div>
      </div>

      {/* 3. Active Profile Session Banner Skeleton */}
      <div className={cn('max-w-7xl mx-auto', GUTTER)}>
        <div className="rounded-2xl p-4 sm:p-5 border border-white/[0.07] bg-[#070b16]/70 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <Skeleton className="w-11 h-11 rounded-full bg-white/[0.08]" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded bg-white/[0.08]" />
              <Skeleton className="h-3.5 w-32 rounded bg-white/[0.04]" />
            </div>
          </div>
          <Skeleton className="h-7 w-32 rounded-full bg-emerald-500/10 border border-emerald-500/20" />
        </div>
      </div>

      {/* 4. Carousel Rows Skeletons (3 Rows) */}
      {[
        { title: 'Top 10 Today', kicker: 'Trending Now' },
        { title: 'Feature Movies', kicker: 'Vault Collection' },
        { title: 'TV Series & Originals', kicker: 'Screen Series' },
      ].map((section, sectionIdx) => (
        <section key={sectionIdx} className="space-y-4">
          {/* Section Header */}
          <div className={cn('flex items-end justify-between', GUTTER)}>
            <div className="space-y-1">
              <Skeleton className="h-3 w-20 rounded bg-white/[0.05]" />
              <Skeleton className="h-6 w-48 rounded-lg bg-white/[0.08]" />
            </div>
            <Skeleton className="h-4 w-16 rounded bg-white/[0.04]" />
          </div>

          {/* Cards Rail */}
          <div className={cn('flex items-stretch gap-3 sm:gap-4 overflow-hidden py-2', GUTTER)}>
            {[...Array(6)].map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="shrink-0 w-[132px] min-[400px]:w-[150px] sm:w-[170px] md:w-[190px] lg:w-[210px] space-y-2.5"
              >
                {/* Poster Box */}
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] p-2.5 flex flex-col justify-between">
                  <Skeleton className="h-4 w-10 rounded bg-emerald-500/20" />
                  <div className="space-y-1.5 pt-2">
                    <Skeleton className="h-3.5 w-3/4 rounded bg-white/[0.08]" />
                    <Skeleton className="h-3 w-1/2 rounded bg-white/[0.04]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
