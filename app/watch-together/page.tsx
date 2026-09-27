'use client';

import React, { Suspense } from 'react';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { WatchGroup } from '@/components/watch-together/WatchGroup';
import { Loader2 } from 'lucide-react';

function WatchTogetherContent() {
  return (
    <CinemaShell>
      {/*
        Top padding clears the fixed CinemaNavbar (plus the iOS status-bar inset).
        The previous `pt-6` sat the first card underneath the navbar on phones,
        where the bar is taller relative to the viewport.
      */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-navbar">
        <WatchGroup />
      </div>
    </CinemaShell>
  );
}

export default function WatchTogetherPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-white">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        </div>
      }
    >
      <WatchTogetherContent />
    </Suspense>
  );
}