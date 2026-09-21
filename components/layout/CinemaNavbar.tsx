import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { ProfileSwitcher } from '@/components/profiles/ProfileSwitcher';
import { Badge } from '@/components/ui/Badge';
import { Logo } from '@/components/ui/Logo';
import { IconButton } from '@/components/ui/IconButton';
import { NAV_LINKS } from '@/lib/constants';
import { Search, Bell, Menu, X, Check, Tv, LogOut } from 'lucide-react';
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
  const { isScrolled } = useScrollPosition();
  const { isTVMode, toggleTVMode } = useTVNavigation();
  const { logout, isLoggingOut } = useActiveProfile();
  const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);

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

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-40 transition-all duration-300 px-4 sm:px-8 lg:px-12',
        isScrolled
          ? 'py-3.5 bg-[#06080d]/92 backdrop-blur-xl border-b border-slate-400/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.7)]'
          : 'py-5 bg-gradient-to-b from-[#06080d]/90 via-[#06080d]/40 to-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Desktop Nav Links */}
        <div className="flex items-center gap-6 lg:gap-10">
          <Logo size="md" />

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                id={link.id}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors cinema-focus"
              >
                <span>{link.label}</span>
                {link.badge && (
                  <Badge variant="sync" size="sm" className="ml-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {link.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Utility: Search, Notifications, Profile, Mobile Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search Button Trigger */}
          <button
            id="nav-search-btn"
            type="button"
            onClick={() => setIsSearchOverlayOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 hover:text-white transition-all text-xs group focus:outline-none focus:ring-1 focus:ring-sky-500/50"
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

          {/* 10-Foot TV Mode Toggle */}
          <button
            id="nav-tv-mode-btn"
            type="button"
            onClick={toggleTVMode}
            className={cn(
              'hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cinema-focus',
              isTVMode
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.08]'
            )}
            title={isTVMode ? 'Exit 10-Foot TV Mode' : 'Switch to 10-Foot TV Mode (Large typography & D-pad focus)'}
          >
            <Tv className={cn('w-3.5 h-3.5', isTVMode ? 'text-sky-400 animate-pulse' : 'text-slate-400')} />
            <span>TV Mode</span>
            {isTVMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
            )}
          </button>

          {/* Notifications Trigger & Popover */}
          <div className="relative">
            <IconButton
              variant="ghost"
              size="sm"
              label="Notifications"
              icon={
                <div className="relative">
                  <Bell className="w-4 h-4 text-slate-300" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-[#06080d]" />
                  )}
                </div>
              }
              onClick={() => setIsNotifOpen(!isNotifOpen)}
            />

            <AnimatePresence>
              {isNotifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNotifOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 rounded-xl bg-[#090e17]/95 backdrop-blur-xl border border-slate-400/[0.14] shadow-2xl z-50 p-2 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
                      <span className="text-xs font-semibold text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark all read</span>
                        </button>
                      )}
                    </div>

                    <div className="py-1 max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-lg text-left transition-colors ${
                            notif.unread ? 'bg-white/[0.04]' : 'opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white">
                              {notif.title}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {notif.time}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-light">
                            {notif.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
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
            className="lg:hidden border-t border-white/[0.06] bg-[#06080d]/95 backdrop-blur-xl mt-3 py-4 px-4 rounded-xl shadow-2xl space-y-3 overflow-hidden"
          >
            {/* Mobile Search Button */}
            <button
              id="nav-mobile-search-btn"
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsSearchOverlayOpen(true);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-sky-400" />
                <span>Search DinuStream</span>
              </div>
              <kbd className="text-[10px] font-mono text-slate-400 bg-white/[0.08] px-1.5 py-0.5 rounded">⌘K</kbd>
            </button>

            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] flex items-center justify-between"
                >
                  <span>{link.label}</span>
                  {link.badge && (
                    <Badge variant="sync" size="sm">
                      {link.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>

            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-[10px] uppercase">Private Cinema Suite</span>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sync Ready</span>
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
