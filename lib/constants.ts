import { UserProfile } from '@/types/cinema';

export const PLATFORM_NAME = 'DinuStream';
export const PLATFORM_TAGLINE = 'Your Private Cinema';
export const PLATFORM_VERSION = 'v1.1.0';

export const PROFILES: Record<'dinu' | 'kanmani', UserProfile> = {
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
  },
  kanmani: {
    id: 'kanmani',
    name: 'Kanmani',
    title: 'Private Screen Royalty',
    avatarUrl: '/avatars/kanmani.svg',
    accentColor: '#f43f5e', // Rose
    glowColor: 'rgba(244, 63, 94, 0.35)',
    favoriteGenre: 'Prestige Drama, Thrillers & Romance',
    isOnline: true,
    statusMessage: 'In synchronized screening room',
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
  { label: 'Movies', href: '#movies', id: 'nav-movies' },
  { label: 'Series', href: '#series', id: 'nav-series' },
  { label: 'Music', href: '#music', id: 'nav-music' },
  { label: 'Watch Together', href: '/watch-together', id: 'nav-watch-together', badge: 'Live Sync' },
  { label: 'My List', href: '#my-list', id: 'nav-my-list' },
];
