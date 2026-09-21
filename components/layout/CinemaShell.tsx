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

/**
 * CinemaShell — the chrome wrapper shared by every browsing page.
 *
 * Navigation breakpoint contract (must stay in sync with CinemaNavbar and
 * MobileBottomNav, otherwise a viewport range ends up with no navigation at
 * all — which is exactly what happened before: the bottom bar hid at `sm`
 * (640px) while the navbar's link row only appeared at `lg` (1024px), leaving
 * tablets with a hamburger as their only entry point).
 *
 *   < 1024px (`lg`)  → fixed bottom tab bar + hamburger drawer in the navbar
 *   >= 1024px (`lg`) → inline navbar links, no bottom bar
 */
export const CinemaShell: React.FC<CinemaShellProps> = ({ children }) => {
  useTVNavigation(true);

  return (
    /*
      `pb-mobile-nav` lives on the shell rather than on <main> so that the
      footer clears the fixed bottom bar too. It reserves the bar height plus
      the iOS home-indicator inset, and is dropped at `lg` where the bar hides.
    */
    /*
      `flex flex-col` + `flex-1` on <main> is what makes the shell always fill
      the viewport. Previously the shell was a plain block with `min-h`, so on a
      short page (an error state, an empty library, a small laptop window) the
      footer floated up into the middle of the screen and left a dead band of
      background below it.
    */
    <div className="relative flex min-h-screen-dynamic flex-col bg-cinema-bg text-slate-200 selection:bg-slate-300 selection:text-cinema-bg pb-mobile-nav lg:pb-0">
      {/* Restrained Midnight Ambient Lighting */}
      <AmbientBackdrop />

      {/* Top Navbar */}
      <CinemaNavbar />

      {/* Main Viewport Content */}
      <main className="relative z-10 flex-1">{children}</main>

      {/* Understated Cinema Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] mt-16 sm:mt-24 lg:mt-28 py-8 sm:py-10 px-4 sm:px-8 lg:px-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <Logo size="sm" asLink={false} />
          <p className="font-mono text-[11px] text-slate-500">
            Private Cinema for Dinu &amp; Kanmani • Bespoke Design System
          </p>
        </div>
      </footer>

      {/* Mobile / tablet bottom navigation (Home, Search, Watch Together, My List, Profile) */}
      <MobileBottomNav />
    </div>
  );
};
