import { UserProfile } from '@/types/cinema';

export const PLATFORM_NAME = 'DinuStream';
export const PLATFORM_TAGLINE = 'Your Private Cinema';
export const PLATFORM_VERSION = 'v1.2.0';

export const PROFILES: Record<string, UserProfile> = {
  dinu: {
    id: 'dinu',
    name: 'Dinu',
    title: 'Cinema Master',
    avatarUrl: '/avatars/characters/iron-man.svg',
    accentColor: '#e50914',
    glowColor: 'rgba(229, 9, 20, 0.45)',
    favoriteGenre: 'Sci-Fi, IMAX & 4K Epics',
    isOnline: true,
    statusMessage: 'Ready for 4K Dolby Atmos Screening',
    pinProtected: true,
    isGuest: false,
  },
  kanmani: {
    id: 'kanmani',
    name: 'Kanmani',
    title: 'Screen Royalty',
    avatarUrl: '/avatars/characters/spider-man.svg',
    accentColor: '#ff003c',
    glowColor: 'rgba(255, 0, 60, 0.45)',
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
    avatarUrl: '/avatars/characters/mandalorian.svg',
    accentColor: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.45)',
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
  { label: 'Premieres', href: '/#new-movies', id: 'nav-new-movies' },
  { label: 'Watch Together', href: '/watch-together', id: 'nav-watch-together' },
  { label: 'Watchlist', href: '/#my-list', id: 'nav-my-list' },
];
