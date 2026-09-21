'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { ProfileSwitcher } from '@/components/profiles/ProfileSwitcher';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';
import { IconButton } from '@/components/ui/IconButton';
import { NAV_LINKS } from '@/lib/constants';
import { Search, Bell, Menu, X, Check, Tv, LogOut, Film, Sparkles, Zap, Bookmark, ShieldCheck, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SearchOverlay } from '@/components/search/SearchOverlay';
import { useTVNavigation } from '@/hooks/useTVNavigation';
import { useActiveProfile } from '@/hooks/useActiveProfile';

export interface CinemaNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

const INITIAL_NOTIFICATIONS: CinemaNotification[] = [
  {
    id: 'n-1',
    title: 'Private Cinema Ready',
    message: 'Jellyfin high-bitrate streaming pipeline operational.',
    time: 'Connected',
    unread: false,
  },
];

export interface CinemaNavbarProps {
  onSearchQuery?: (query: string) => void;
}

export const CinemaNavbar: React.FC<CinemaNavbarProps> = ({ onSearchQuery }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isScrolled } = useScrollPosition();
  const { isTVMode, toggleTVMode } = useTVNavigation();
  const { profile, logout } = useActiveProfile();
  
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  // Update active tab on scroll when on home page
  useEffect(() => {
    if (pathname !== '/') return;

    const sections = ['movies', 'series', 'new-movies', 'my-list'];
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      let currentSection = 'home';

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el && el.offsetTop <= scrollPos) {
          currentSection = sectionId;
        }
      }
      setActiveTab(currentSection);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname]);

  // Global Keyboard Shortcuts (Cmd+K, Ctrl+K, /) and Custom Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOverlayOpen((prev) => !prev);
      }
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (!isSearchOverlayOpen && e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {
        e.preventDefault();
        setIsSearchOverlayOpen(true);
      }
    };

    const handleOpenSearchEvent = () => setIsSearchOverlayOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dinustream-open-search', handleOpenSearchEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dinustream-open-search', handleOpenSearchEvent);
    };
  }, [isSearchOverlayOpen]);

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (href.startsWith('/#')) {
      const targetId = href.replace('/#', '');
      if (pathname === '/') {
        e.preventDefault();
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setActiveTab(targetId);
        }
      } else {
        // Will route to /#id
      }
    } else if (href === '/') {
      if (pathname === '/') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setActiveTab('home');
      }
    }
    setIsMobileMenuOpen(false);
  };

  const getNavIcon = (id: string) => {
    switch (id) {
      case 'nav-home':
        return <Home className="w-4 h-4 text-slate-400 group-hover:text-white" />;
      case 'nav-movies':
        return <Film className="w-4 h-4 text-slate-400 group-hover:text-white" />;
      case 'nav-series':
        return <Tv className="w-4 h-4 text-slate-400 group-hover:text-white" />;
      case 'nav-new-movies':
        return <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-white" />;
      case 'nav-watch-together':
        return <Zap className="w-4 h-4 text-sky-400 group-hover:text-sky-300" />;
      case 'nav-my-list':
        return <Bookmark className="w-4 h-4 text-slate-400 group-hover:text-white" />;
      default:
        return null;
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-40 transition-all duration-300 px-4 sm:px-8 lg:px-12',
        isScrolled
          ? 'py-2.5 bg-[#030611]/92 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.9)]'
          : 'py-4 bg-gradient-to-b from-[#030611]/95 via-[#030611]/40 to-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Desktop Nav Links */}
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="cinema-focus rounded-lg">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation Links — Ultra Luxury Cinema */}
          <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] px-2 py-1 rounded-2xl border border-white/[0.06] backdrop-blur-xl">
            {NAV_LINKS.map((link) => {
              const targetId = link.href.startsWith('/#') ? link.href.replace('/#', '') : (link.href === '/' ? 'home' : link.id);
              const isActive = (pathname === '/' && activeTab === targetId) || (pathname === link.href);
              const isWatchTogether = link.id === 'nav-watch-together';

              return (
                <Link
                  key={link.id}
                  href={link.href}
                  id={link.id}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={cn(
                    'group relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium tracking-wide whitespace-nowrap transition-all cinema-focus select-none',
                    isActive
                      ? 'text-white bg-white/[0.1] shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                  )}
                >
                  {getNavIcon(link.id)}
                  <span>{link.label}</span>
                  {isWatchTogether && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 inset-x-3 h-0.5 bg-gradient-to-r from-cyan-400 to-sky-500 rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Utility: Search, Admin, TV Mode, Notifications, Profile, Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Button Trigger */}
          <button
            id="nav-search-btn"
            type="button"
            onClick={() => setIsSearchOverlayOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 hover:text-white transition-all text-xs group focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            aria-label="Search DinuStream (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-colors" />
            <span className="hidden sm:inline font-normal text-slate-400 group-hover:text-slate-200 transition-colors">
              Search...
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded shadow-sm">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </button>

          {/* Admin Studio Quick Trigger */}
          <Link
            href="/admin"
            title="Cinema Admin Studio"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span>Admin</span>
          </Link>

          {/* 10-Foot TV Mode Toggle */}
          <button
            id="nav-tv-mode-btn"
            type="button"
            onClick={toggleTVMode}
            className={cn(
              'hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cinema-focus',
              isTVMode
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
            title="Toggle TV Leanback Mode"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isTVMode ? 'TV Mode ON' : 'TV Mode'}</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <IconButton
              variant="ghost"
              size="sm"
              label="Notifications"
              icon={
                <div className="relative">
                  <Bell className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#050811]" />
                  )}
                </div>
              }
              onClick={() => setIsNotifOpen((prev) => !prev)}
            />

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#090e1a]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl p-4 space-y-3 z-50"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <span className="text-xs font-bold text-white tracking-wide uppercase">
                      Cinema Feed
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'p-2.5 rounded-xl border text-xs space-y-1 transition-all',
                          n.unread
                            ? 'bg-sky-500/[0.08] border-sky-500/30 text-slate-200'
                            : 'bg-white/[0.02] border-white/[0.05] text-slate-400'
                        )}
                      >
                        <div className="flex items-center justify-between font-semibold text-white">
                          <span>{n.title}</span>
                          <span className="text-[10px] text-slate-500">{n.time}</span>
                        </div>
                        <p className="line-clamp-2 leading-relaxed text-[11px] font-light">
                          {n.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile Switcher */}
          <ProfileSwitcher />

          {/* Mobile Menu Hamburger */}
          <div className="lg:hidden">
            <IconButton
              variant="ghost"
              size="sm"
              label="Toggle navigation menu"
              icon={
                isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-300" />
                )
              }
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-white/[0.08] bg-[#050811]/98 backdrop-blur-2xl mt-3 py-4 px-4 rounded-2xl shadow-2xl space-y-3 overflow-hidden"
          >
            {/* Mobile Search Button */}
            <button
              id="nav-mobile-search-btn"
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSearchOverlayOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-sky-400" />
                <span>Search Cinema Vault</span>
              </div>
              <kbd className="text-[10px] font-mono text-slate-400 bg-white/[0.08] px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>

            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    {getNavIcon(link.id)}
                    <span>{link.label}</span>
                  </div>
                  
                </Link>
              ))}

              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-sky-300 hover:bg-sky-500/10 flex items-center gap-2.5"
              >
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                <span>Admin Operations Studio</span>
              </Link>
            </nav>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[10px] uppercase">Private Cinema Suite</span>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Dolby Stream Connected</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Cinema Search Overlay */}
      <SearchOverlay
        isOpen={isSearchOverlayOpen}
        onClose={() => setIsSearchOverlayOpen(false)}
      />
    </header>
  );
};
