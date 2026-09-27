// Map Jellyfin users -> DinuStream UserProfile for the profile picker and shell.

import { UserProfile } from '@/types/cinema';
import { JellyfinUser } from './types';

const CHARACTER_AVATARS = [
  '/avatars/characters/iron-man.svg',
  '/avatars/characters/batman.svg',
  '/avatars/characters/spider-man.svg',
  '/avatars/characters/mandalorian.svg',
  '/avatars/characters/grogu.svg',
  '/avatars/characters/deadpool.svg',
  '/avatars/characters/thor.svg',
  '/avatars/characters/loki.svg',
  '/avatars/characters/neo.svg',
  '/avatars/characters/dune-paul.svg',
  '/avatars/characters/black-panther.svg',
  '/avatars/characters/cyber-ronin.svg',
  '/avatars/characters/darth-vader.svg',
  '/avatars/characters/wolverine.svg',
];

const ACCENTS = [
  '#e50914', '#38bdf8', '#f43f5e', '#a78bfa', '#34d399',
  '#fbbf24', '#60a5fa', '#f472b6', '#2dd4bf', '#fb923c',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function userImageUrl(user: JellyfinUser): string {
  if (!user.Id) return '';
  const tag = user.PrimaryImageTag;
  return `/jellyfin/Users/${user.Id}/Images/Primary${tag ? `?tag=${tag}&quality=90` : ''}`;
}

export function mapUserToProfile(user: JellyfinUser): UserProfile {
  const key = user.Id ?? user.Name ?? 'user';
  const h = hash(key);
  const accent = ACCENTS[h % ACCENTS.length];
  const hasImage = Boolean(user.PrimaryImageTag);
  return {
    id: key,
    name: user.Name ?? 'Guest',
    title: 'Cinema Member',
    avatarUrl: hasImage ? userImageUrl(user) : CHARACTER_AVATARS[h % CHARACTER_AVATARS.length],
    accentColor: accent,
    glowColor: accent,
    favoriteGenre: 'Cinema',
    isOnline: true,
    pinProtected: Boolean(user.HasPassword),
    statusMessage: 'Streaming from your private library',
    isGuest: false,
  };
}
