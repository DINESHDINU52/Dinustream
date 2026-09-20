'use client';

import React from 'react';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { WatchGroup } from '@/components/watch-together/WatchGroup';

export default function WatchTogetherPage() {
  return (
    <CinemaShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10">
        <WatchGroup />
      </div>
    </CinemaShell>
  );
}
