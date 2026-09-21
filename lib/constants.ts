import { UserProfile } from '@/types/cinema';

export const PLATFORM_NAME = 'DinuStream';
export const PLATFORM_TAGLINE = 'Your Private Cinema';
export const PLATFORM_VERSION = 'v1.2.0';

export const PROFILES: Record<string, UserProfile> = {
  dinu: {
    id: 'dinu',
    name: 'Dinu',
    title: 'Cinema Master',
    avatarUrl: '/avatars/dinu.svg',
    accentColor: '#38bdf8', // Cyan
    glowColor: 'rgba(56, 189, 248, 0.35)',
    favoriteGenre: 'Sci-Fi, IMAX & 4K Epics',
    isOnline: true,
    statusMessage: 'Ready for Dune: Part Two in 4K Atmos',
    pinProtected: true,
    isGuest: false,
  },
  kanmani: {
    id: 'kanmani',
    name: 'Kanmani',
    title: 'Screen Royalty',
    avatarUrl: '/avatars/kanmani.svg',
    accentColor: '#f43f5e', // Rose
    glowColor: 'rgba(244, 63, 94, 0.35)',
    favoriteGenre: 'Prestige Drama, Thrillers & Romance',
    isOnline: true,
    statusMessage: 'In synchronized screening room',
    pinProtected: true,
    isGuest: false,
  },
  guest: {
    id: 'guest',
    name: 'Guest 1',
    title: 'Cinema Guest',
    avatarUrl: '/avatars/guest.svg',
    accentColor: '#10b981', // Emerald
    glowColor: 'rgba(16, 185, 129, 0.35)',
    favoriteGenre: 'Blockbusters & Popular Cinema',
    isOnline: false,
    statusMessage: 'Visiting private cinema',
    pinProtected: false,
    isGuest: true,
  },
};

export interface NavLinkItem {
  label: string;
  href: string;
  id: string;
  badge?: string;
}

export const NAV_LINKS: NavLinkItem[] = [
  { label: 'Home', href: '/', id: 'nav-home' },
  { label: 'Movies', href: '/#movies', id: 'nav-movies' },
  { label: 'Series', href: '/#series', id: 'nav-series' },
  { label: 'Newly Added', href: '/#new-movies', id: 'nav-new-movies', badge: 'New' },
  { label: 'Watch Together', href: '/watch-together', id: 'nav-watch-together', badge: 'Live Sync' },
  { label: 'My List', href: '/#my-list', id: 'nav-my-list' },
];
