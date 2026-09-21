'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Users, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { cn } from '@/lib/utils';

export interface MobileBottomNavProps {
  onOpenSearch?: () => void;
}

/**
 * MobileBottomNav — the primary navigation for phones and tablets.
 *
 * Visible below `lg` (1024px), which is exactly where CinemaNavbar swaps its
 * inline link row for the hamburger drawer. See the breakpoint contract
 * documented on CinemaShell.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSearch }) => {
  const pathname = usePathname();
  const { profile, switchProfile } = useActiveProfile();

  /*
    Hash state has to be tracked in React state rather than read inline from
    `window.location.hash` during render. Reading it during render is a
    hydration hazard (the server has no `window`, so the first client render
    disagrees with the server HTML) and it never re-renders when the hash
    changes, so the "My List" tab could never actually light up.
  */
  const [hash, setHash] = useState('');

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      window.dispatchEvent(new CustomEvent('dinustream-open-search'));
    }
  };

  /*
    Profile switching intentionally routes through the login screen so the
    session cookie is re-issued for the new profile (see
    useActiveProfile.switchProfile). The old implementation passed a target
    profile id and advertised itself as an instant in-place toggle, but
    `switchProfile` ignores its argument and ends the session — so tapping the
    tab looked like a no-op that then dumped the user on the login page. The
    label and tooltip below now describe what actually happens.
  */
  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    void switchProfile();
  };

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/' && hash === '',
    },
    {
      id: 'search',
      label: 'Search',
      href: '#search',
      icon: Search,
      onClick: handleSearchClick,
      isActive: false,
    },
    {
      id: 'watch-together',
      label: 'Together',
      href: '/watch-together',
      icon: Users,
      badge: 'Live',
      isActive: pathname.startsWith('/watch-together'),
    },
    {
      id: 'my-list',
      label: 'My List',
      href: '/#my-list',
      icon: Bookmark,
      isActive: pathname === '/' && hash === '#my-list',
    },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-strong glass-bar-top-edge pb-safe-flush px-safe"
    >
      {/*
        Fixed 56px row height matches --cinema-mobile-nav-height, which is what
        the `pb-mobile-nav` content offset is derived from.
      */}
      <div className="grid grid-cols-5 items-stretch h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <motion.span
              whileTap={{ scale: 0.9 }}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-full h-full relative',
                item.isActive ? 'text-white' : 'text-slate-400'
              )}
            >
              <span className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    item.isActive ? 'text-sky-400 scale-110' : 'text-slate-400'
                  )}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-3 px-1 py-px rounded-full bg-emerald-500 text-[8px] leading-tight font-bold text-white uppercase tracking-tight">
                    {item.badge}
                  </span>
                )}
              </span>
              {/*
                Labels are clamped and centred instead of `truncate`d at a fixed
                pixel width: on a 320px-wide device each of the five columns is
                only 64px, so "Watch Together" was being cut mid-word.
              */}
              <span
                className={cn(
                  'text-[10px] leading-none tracking-tight font-medium max-w-full px-0.5 truncate',
                  item.isActive ? 'text-white font-semibold' : 'text-slate-400'
                )}
              >
                {item.label}
              </span>
              {item.isActive && (
                <motion.span
                  layoutId="bottomNavIndicator"
                  className="absolute bottom-0.5 w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.span>
          );

          if (item.onClick) {
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={item.onClick}
                type="button"
                aria-label={item.label}
                className="flex items-center justify-center w-full h-full cinema-focus focus:outline-none"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              id={`mobile-nav-${item.id}`}
              href={item.href}
              aria-current={item.isActive ? 'page' : undefined}
              className="flex items-center justify-center w-full h-full cinema-focus focus:outline-none"
            >
              {content}
            </Link>
          );
        })}

        {/* 5th tab: profile / switch profile */}
        <button
          id="mobile-nav-profile"
          onClick={handleProfileClick}
          type="button"
          className="flex items-center justify-center w-full h-full cinema-focus focus:outline-none"
          aria-label={`Signed in as ${profile.name}. Switch profile`}
          title={`Signed in as ${profile.name} — tap to switch profile`}
        >
          <motion.span
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center justify-center gap-0.5 text-slate-400"
          >
            <span
              className={cn(
                'w-6 h-6 rounded-full overflow-hidden border-2 p-0.5 bg-[#0e1726] flex items-center justify-center',
                profile.id === 'dinu'
                  ? 'border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                  : profile.id === 'kanmani'
                  ? 'border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                  : 'border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatarUrl}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover rounded-full"
              />
            </span>
            <span className="text-[10px] leading-none tracking-tight font-medium text-slate-300 max-w-full px-0.5 truncate">
              {profile.name}
            </span>
          </motion.span>
        </button>
      </div>
    </nav>
  );
};
