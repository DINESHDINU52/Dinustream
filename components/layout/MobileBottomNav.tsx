'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Users, Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { cn } from '@/lib/utils';

export interface MobileBottomNavProps {
  onOpenSearch?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSearch }) => {
  const pathname = usePathname();
  const { profile, switchProfile } = useActiveProfile();

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenSearch) {
      onOpenSearch();
    } else {
      window.dispatchEvent(new CustomEvent('dinustream-open-search'));
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Quick toggle between Dinu & Kanmani on mobile bottom bar
    const nextProfileId = profile.id === 'dinu' ? 'kanmani' : 'dinu';
    switchProfile(nextProfileId);
  };

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
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
      label: 'Watch Together',
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
      isActive: pathname === '/my-list' || (typeof window !== 'undefined' && window.location.hash === '#my-list'),
    },
  ];

  return (
    <nav
      id="mobile-bottom-navigation"
      aria-label="Mobile Bottom Navigation"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#06080d]/95 backdrop-blur-2xl border-t border-white/[0.08] shadow-[0_-10px_35px_rgba(0,0,0,0.85)] pb-safe transition-all duration-300"
    >
      <div className="grid grid-cols-5 items-center h-14 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={cn(
                'flex flex-col items-center justify-center py-1 rounded-xl transition-all relative',
                item.isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-5 h-5 transition-transform duration-200',
                    item.isActive ? 'text-sky-400 scale-110' : 'text-slate-400'
                  )}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-2.5 px-1 py-0.2 rounded-full bg-emerald-500 text-[8px] font-bold text-white uppercase tracking-tighter">
                    {item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] tracking-tight mt-0.5 font-medium truncate max-w-[64px]',
                  item.isActive ? 'text-white font-semibold' : 'text-slate-400'
                )}
              >
                {item.label}
              </span>
              {item.isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </motion.div>
          );

          if (item.onClick) {
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={item.onClick}
                type="button"
                className="flex items-center justify-center w-full focus:outline-none"
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
              className="flex items-center justify-center w-full focus:outline-none"
            >
              {content}
            </Link>
          );
        })}

        {/* 5th Tab: Profile */}
        <button
          id="mobile-nav-profile"
          onClick={handleProfileClick}
          type="button"
          className="flex items-center justify-center w-full focus:outline-none"
          title={`Profile: ${profile.name} (Tap to switch)`}
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center justify-center py-1 relative text-slate-400 hover:text-white"
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full overflow-hidden border-2 transition-all p-0.5 bg-[#0e1726]',
                profile.id === 'dinu'
                  ? 'border-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                  : 'border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 font-medium text-slate-300">
              {profile.name}
            </span>
          </motion.div>
        </button>
      </div>
    </nav>
  );
};
