'use client';

import React from 'react';
import { CinemaShell } from '@/components/layout/CinemaShell';
import { DesignSystemShowcase } from '@/components/design-system/DesignSystemShowcase';

export default function DesignSystemPage() {
  return (
    <CinemaShell>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-navbar pb-24">
        <DesignSystemShowcase />
      </div>
    </CinemaShell>
  );
}
