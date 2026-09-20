'use client';

import React from 'react';
import { CinemaNavbar } from './CinemaNavbar';
import { MobileBottomNav } from './MobileBottomNav';
import { AmbientBackdrop } from './AmbientBackdrop';
import { Logo } from '@/components/ui/Logo';
import { useTVNavigation } from '@/hooks/useTVNavigation';

export interface CinemaShellProps {
  children: React.ReactNode;
}

export const CinemaShell: React.FC<CinemaShellProps> = ({ children }) => {
  useTVNavigation(true);

  return (
    <div className="relative min-h-screen bg-[#06080d] text-slate-200 selection:bg-slate-300 selection:text-[#06080d] cinema-grain">
      {/* Restrained Midnight Ambient Lighting */}
      <AmbientBackdrop />

      {/* Top Navbar */}
      <CinemaNavbar />

      {/* Main Viewport Content with mobile padding for bottom nav */}
      <main className="relative z-10 pb-20 sm:pb-0">{children}</main>

      {/* Understated Cinema Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] mt-28 py-10 px-4 sm:px-8 lg:px-12 text-xs text-slate-500 mb-16 sm:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" asLink={false} />
          <p className="font-mono text-[11px] text-slate-500">
            Private Cinema for Dinu & Kanmani • Bespoke Design System
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (Home, Search, Watch Together, My List, Profile) */}
      <MobileBottomNav />
    </div>
  );
};
