'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, ContinueWatchingItem } from '@/types/cinema';
import { UserPreferences, UserProfileData, WatchHistoryItem } from '@/types/profile';
import { profileService } from '@/lib/services/profileService';
import { authService } from '@/lib/services/authService';
import { PROFILES } from '@/lib/constants';
import { fetchContinueWatching, fetchFavorites, setFavorite } from '@/lib/jellyfin/queries';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

const FRIENDS_AVATAR = '/avatars/characters/grogu.svg';

export function useActiveProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(() =>
    DEMO ? profileService.getActiveProfileData().profile : PROFILES.guest
  );
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [myList, setMyList] = useState<string[]>([]);
  const [settings, setSettings] = useState<UserPreferences>(() => profileService.getActiveProfileData().settings);

  useEffect(() => {
    if (DEMO) {
      const syncFromStore = () => {
        const data = profileService.getActiveProfileData();
        setProfile(data.profile);
        setContinueWatching(data.continueWatching);
        setMyList(data.myList);
        setSettings(data.settings);
      };
      syncFromStore();
      return profileService.subscribe(syncFromStore);
    }

    let cancelled = false;
    (async () => {
      const status = await authService.status();
      if (!status.authenticated) return;
      const [prof, cw, favs] = await Promise.all([
        authService.currentProfile().catch(() => null),
        fetchContinueWatching(20).catch(() => []),
        fetchFavorites(200).catch(() => []),
      ]);
      if (cancelled) return;
      if (prof) {
        setProfile(prof);
        setSettings(profileService.getSettingsFor(prof.id));
      }
      setContinueWatching(cw);
      setMyList(favs.map((f) => f.id));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    router.push('/login');
    router.refresh();
  }, [router]);

  const switchProfile = useCallback(
    (_targetId?: string) => {
      router.push('/login');
    },
    [router]
  );

  const updateSettings = useCallback(
    (partial: Partial<UserPreferences>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        profileService.updateSettings(profile.id, partial);
        return next;
      });
    },
    [profile.id]
  );

  const toggleMyList = useCallback(
    (mediaId: string) => {
      const exists = myList.includes(mediaId);
      setMyList((prev) => (exists ? prev.filter((id) => id !== mediaId) : [...prev, mediaId]));
      if (!DEMO) setFavorite(mediaId, !exists).catch(() => {});
      return !exists;
    },
    [myList]
  );

  const addToMyList = useCallback(
    (mediaId: string) => {
      setMyList((prev) => (prev.includes(mediaId) ? prev : [...prev, mediaId]));
      if (!DEMO) setFavorite(mediaId, true).catch(() => {});
    },
    []
  );

  const removeFromMyList = useCallback(
    (mediaId: string) => {
      setMyList((prev) => prev.filter((id) => id !== mediaId));
      if (!DEMO) setFavorite(mediaId, false).catch(() => {});
    },
    []
  );

  const updateContinueWatching = useCallback((item: ContinueWatchingItem) => {
    setContinueWatching((prev) => [item, ...prev.filter((c) => c.id !== item.id)]);
  }, []);

  const removeFromContinueWatching = useCallback((mediaId: string) => {
    setContinueWatching((prev) => prev.filter((c) => c.id !== mediaId));
  }, []);

  const addWatchHistory = useCallback(
    (item: Omit<WatchHistoryItem, 'id' | 'watchedAt'>) => {
      profileService.addWatchHistory(profile.id, item);
    },
    [profile.id]
  );

  const clearWatchHistory = useCallback(() => {
    profileService.clearWatchHistory(profile.id);
  }, [profile.id]);

  const companionProfile: UserProfile = {
    ...profile,
    id: 'friends',
    name: 'Friends',
    avatarUrl: FRIENDS_AVATAR,
  };

  const data: UserProfileData = {
    profile,
    continueWatching,
    myList,
    watchHistory: [],
    settings,
  };

  return {
    profile,
    profileId: profile.id,
    companionProfile,
    allProfiles: [profile],
    isCurrentOnline: true,
    logout,
    switchProfile,
    isLoggingOut: false,
    isReady: true,
    data,
    continueWatching,
    myList,
    watchHistory: [],
    settings,
    updateSettings,
    toggleMyList,
    addToMyList,
    removeFromMyList,
    updateContinueWatching,
    removeFromContinueWatching,
    addWatchHistory,
    clearWatchHistory,
  };
}
