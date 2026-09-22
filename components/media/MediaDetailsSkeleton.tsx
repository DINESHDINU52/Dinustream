'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export const MediaDetailsSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-300">
      {/* 1. Backdrop Hero Skeleton */}
      <div className="relative w-full h-[50vh] sm:h-[62vh] md:h-[70vh] bg-gradient-to-b from-[#0a0e1a] via-[#060a12] to-[#04070e] overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#04070e] via-[#04070e]/60 to-transparent z-10" />
      </div>

      {/* 2. Content Info Panel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 -mt-32 sm:-mt-44 md:-mt-56 relative z-20">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start">
          {/* Left: Poster Skeleton */}
          <div className="shrink-0 w-44 sm:w-56 md:w-72 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.08] bg-white/[0.03]">
            <Skeleton className="w-full h-full" />
          </div>

          {/* Right: Metadata & Info Skeleton */}
          <div className="flex-1 w-full space-y-5 pt-2 sm:pt-6">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-16 rounded-full bg-emerald-500/20" />
              <Skeleton className="h-6 w-20 rounded-full bg-white/[0.07]" />
              <Skeleton className="h-6 w-24 rounded-full bg-sky-500/20" />
              <Skeleton className="h-6 w-20 rounded-full bg-white/[0.06]" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Skeleton className="h-10 sm:h-12 md:h-14 w-11/12 max-w-2xl rounded-2xl bg-white/[0.08]" />
              <Skeleton className="h-5 w-52 rounded bg-white/[0.05]" />
            </div>

            {/* Description lines */}
            <div className="space-y-2.5 max-w-2xl pt-2">
              <Skeleton className="h-4 w-full rounded bg-white/[0.05]" />
              <Skeleton className="h-4 w-11/12 rounded bg-white/[0.04]" />
              <Skeleton className="h-4 w-4/5 rounded bg-white/[0.04]" />
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Skeleton className="h-12 w-44 rounded-xl bg-amber-500/20 border-amber-500/30" />
              <Skeleton className="h-12 w-48 rounded-xl bg-sky-500/15 border-sky-500/30" />
              <Skeleton className="h-12 w-12 rounded-xl bg-white/[0.06]" />
            </div>

            {/* Cast & Crew Grid */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-white/[0.06] max-w-2xl">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-16 rounded bg-white/[0.04]" />
                  <Skeleton className="h-4 w-28 rounded bg-white/[0.08]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Bottom Carousel / Episodes Skeleton */}
        <div className="mt-16 sm:mt-20 space-y-4">
          <Skeleton className="h-6 w-44 rounded-lg bg-white/[0.08]" />
          <div className="flex items-stretch gap-3 sm:gap-4 overflow-hidden py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="shrink-0 w-44 sm:w-56 aspect-[16/9] rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                <Skeleton className="w-full h-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
