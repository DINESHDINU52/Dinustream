'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { ProfileSwitcher } from '@/components/profiles/ProfileSwitcher';
import { Logo } from '@/components/ui/Logo';
import { IconButton } from '@/components/ui/IconButton';
import { NAV_LINKS } from '@/lib/constants';
import { Search, Bell, Menu, X, Tv, Film, Sparkles, Zap, Bookmark, ShieldCheck, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SearchOverlay } from '@/components/search/SearchOverlay';
import { useTVNavigation } from '@/hooks/useTVNavigation';

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

/** Home-page section ids the scroll spy tracks, in document order. */
const SPY_SECTIONS = ['movies', 'series', 'new-movies', 'my-list'] as const;

export const CinemaNavbar: React.FC = () => {
  const pathname = usePathname();
  const { isScrolled } = useScrollPosition();
  const { isTVMode, toggleTVMode } = useTVNavigation();

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

  /*
    The drawer's open state is stored as *the route it was opened on* instead of
    a plain boolean. Deriving `isMobileMenuOpen` from the current pathname means
    the drawer closes by itself on any navigation — including browser
    back/forward — without an effect that writes state during a render pass.
  */
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const isMobileMenuOpen = menuOpenPath === pathname;

  const closeMobileMenu = () => setMenuOpenPath(null);
  const toggleMobileMenu = () => setMenuOpenPath(isMobileMenuOpen ? null : pathname);

  const notifRef = useRef<HTMLDivElement>(null);

  /*
    Scroll spy for the home page's section anchors.

    Nothing is reset when leaving `/` because `activeTab` is only ever consulted
    alongside a `pathname === '/'` check below — writing state here just to clear
    it would be a cascading render for no visible benefit.
  */
  useEffect(() => {
    if (pathname !== '/') return;

    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      let currentSection = 'home';

      for (const sectionId of SPY_SECTIONS) {
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

  /*
    The notification popover previously had no dismissal path other than
    re-tapping the bell, so on touch devices it stayed pinned over the content.
    Outside-click and Escape now close it.
  */
  useEffect(() => {
    if (!isNotifOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNotifOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isNotifOpen]);

  // Global keyboard shortcuts (Cmd/Ctrl+K, `/`) and the cross-component open event
  useEffect(() => {
    const isTypingTarget = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      return (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) ||
        node.isContentEditable === true
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOverlayOpen((prev) => !prev);
        return;
      }
      /*
        `document.activeElement` was used here, which is wrong for the `/`
        shortcut: while typing inside the search overlay the active element is
        the input, but any other focusable host (a content-editable chat
        composer) was not covered. Checking the event target is both correct
        and cheaper.
      */
      if (e.key === '/' && !isTypingTarget(e.target)) {
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
  }, []);

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
      }
    } else if (href === '/' && pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setActiveTab('home');
    }
    closeMobileMenu();
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
        /*
          Fixed, flush to the top edge, and the same height in both states.

          `cinema-navbar-pad` supplies symmetric padding with the iOS safe-area
          inset added on top (see styles/cinema.css §7 for why the previous
          `py-3 + pt-safe-flush` pairing collapsed the top padding to zero).

          Only the *surface* changes on scroll, not the geometry. Previously the
          padding shrank from `py-4` to `py-2.5` at the same moment the
          background appeared, so the bar visibly jolted and resized the instant
          you touched the wheel.
        */
        'fixed top-0 inset-x-0 z-40 px-4 sm:px-6 lg:px-12 cinema-navbar-pad',
        'transition-[background-color,box-shadow,border-color] duration-300',
        isScrolled
          ? 'glass-strong glass-bar-bottom-edge'
          : 'glass-subtle glass-bar-bottom-edge glass-bar-seamless'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: brand logo & desktop nav links */}
        <div className="flex items-center gap-4 lg:gap-8 min-w-0">
          <Link href="/" className="cinema-focus rounded-lg shrink-0" aria-label="DinuStream Home">
            <Logo size="md" asLink={false} />
          </Link>

          {/* Inline navigation — desktop only (>= lg), mirrored by the bottom bar below lg */}
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-1 bg-white/[0.03] px-2 py-1 rounded-2xl border border-white/[0.06] backdrop-blur-xl"
          >
            {NAV_LINKS.map((link) => {
              const targetId = link.href.startsWith('/#')
                ? link.href.replace('/#', '')
                : link.href === '/'
                ? 'home'
                : link.id;
              const isActive = (pathname === '/' && activeTab === targetId) || pathname === link.href;
              const isWatchTogether = link.id === 'nav-watch-together';

              return (
                <Link
                  key={link.id}
                  href={link.href}
                  id={link.id}
                  onClick={(e) => handleNavClick(e, link.href)}
                  aria-current={isActive ? 'page' : undefined}
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

        {/* Right utilities: search, admin, TV mode, notifications, profile, hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Global search trigger */}
          <button
            id="nav-search-btn"
            type="button"
            onClick={() => setIsSearchOverlayOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 hover:text-white transition-all text-xs group focus:outline-none focus:ring-1 focus:ring-sky-500/50 touch-target"
            aria-label="Search DinuStream"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-sky-400 transition-colors" />
            <span className="hidden md:inline font-normal text-slate-400 group-hover:text-slate-200 transition-colors">
              Search...
            </span>
            {/* The ⌘K hint is meaningless without a physical keyboard. */}
            <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-400 bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded shadow-sm">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </button>

          {/* Admin studio shortcut */}
          <Link
            href="/admin"
            title="Cinema Admin Studio"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Admin</span>
          </Link>

          {/* 10-foot TV mode toggle */}
          <button
            id="nav-tv-mode-btn"
            type="button"
            onClick={toggleTVMode}
            aria-pressed={isTVMode}
            className={cn(
              'hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cinema-focus',
              isTVMode
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
            title="Toggle TV Leanback Mode"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{isTVMode ? 'TV Mode ON' : 'TV Mode'}</span>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <IconButton
              variant="ghost"
              size="sm"
              label="Notifications"
              aria-expanded={isNotifOpen}
              className="touch-target"
              icon={
                <span className="relative">
                  <Bell className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#050811]" />
                  )}
                </span>
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
                  role="dialog"
                  aria-label="Cinema feed"
                  /*
                    `w-80` alone overflowed the right edge on 320–360px devices.
                    Clamping to the viewport width minus the shell gutters keeps
                    it on screen at every size.
                  */
                  className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl glass-strong glass-sheen p-4 space-y-3 z-50"
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
                        <div className="flex items-center justify-between gap-2 font-semibold text-white">
                          <span className="min-w-0 truncate">{n.title}</span>
                          <span className="text-[10px] text-slate-500 shrink-0">{n.time}</span>
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

          {/* Profile switcher */}
          <ProfileSwitcher />

          {/* Mobile / tablet hamburger */}
          <div className="lg:hidden">
            <IconButton
              variant="ghost"
              size="sm"
              label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              className="touch-target"
              icon={
                isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-slate-300" />
                )
              }
              onClick={toggleMobileMenu}
            />
          </div>
        </div>
      </div>

      {/* Mobile / tablet drawer navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden"
          >
            {/*
              The drawer is nested inside a fixed header, so it cannot grow past
              the viewport: in landscape on a phone the full link list plus the
              admin row is taller than the screen and the bottom entries became
              unreachable. Capping the height and scrolling internally fixes it.
            */}
            <div className="mt-3 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain glass-strong py-4 px-4 rounded-2xl space-y-3">
              {/* Mobile search */}
              <button
                id="nav-mobile-search-btn"
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  setIsSearchOverlayOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-sky-400" />
                  <span>Search Cinema Vault</span>
                </span>
                <kbd className="hidden md:inline text-[10px] font-mono text-slate-400 bg-white/[0.08] px-1.5 py-0.5 rounded">
                  ⌘K
                </kbd>
              </button>

              <nav aria-label="Mobile" className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="px-3 py-3 rounded-xl text-sm font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] flex items-center gap-2.5"
                  >
                    {getNavIcon(link.id)}
                    <span>{link.label}</span>
                  </Link>
                ))}

                <Link
                  href="/admin"
                  onClick={closeMobileMenu}
                  className="px-3 py-3 rounded-xl text-sm font-medium text-sky-300 hover:bg-sky-500/10 flex items-center gap-2.5"
                >
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Admin Operations Studio</span>
                </Link>
              </nav>

              <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span className="font-mono text-[10px] uppercase">Private Cinema Suite</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Dolby Stream Connected</span>
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global cinema search overlay */}
      <SearchOverlay isOpen={isSearchOverlayOpen} onClose={() => setIsSearchOverlayOpen(false)} />
    </header>
  );
};
