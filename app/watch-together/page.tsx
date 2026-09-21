'use client';

import React from 'react';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { WatchGroup } from '@/components/watch-together/WatchGroup';

export default function WatchTogetherPage() {
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
