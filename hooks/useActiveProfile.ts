'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile, ContinueWatchingItem } from '@/types/cinema';
import { UserPreferences, UserProfileData, WatchHistoryItem } from '@/types/profile';
import { profileService } from '@/lib/services/profileService';
import { presenceService, ProfilePresence } from '@/lib/services/presenceService';
import { PROFILES } from '@/lib/constants';

export function useActiveProfile() {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string>(() => profileService.getActiveProfileId());
  const [profileData, setProfileData] = useState<UserProfileData>(() =>
    profileService.getActiveProfileData()
  );
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>(() =>
    profileService.getAllProfiles()
  );
  const [presenceMap, setPresenceMap] = useState<Record<string, ProfilePresence>>({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // 1. Subscribe to profile data updates
    const unsubscribeProfile = profileService.subscribe(() => {
      const currentActiveId = profileService.getActiveProfileId();
      setActiveId(currentActiveId);
      setProfileData(profileService.getActiveProfileData());
      setAllProfiles(profileService.getAllProfiles());
    });

    // 2. Subscribe to live online/offline presence updates
    const unsubscribePresence = presenceService.subscribe((presences) => {
      setPresenceMap(presences);
    });

    return () => {
      unsubscribeProfile();
      unsubscribePresence();
    };
  }, []);

  // Universal Logout function
  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      presenceService.stopHeartbeat();
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setIsLoggingOut(false);
      router.push('/login');
      router.refresh();
    }
  }, [router]);

  /**
   * Switch profile.
   *
   * By design this always routes through the login screen: the profile is
   * carried in an HTTP-only session cookie, so it can only be changed by
   * re-authenticating. It deliberately takes no target-profile argument —
   * callers used to pass one (`switchProfile('kanmani')`) and reasonably
   * expected an in-place swap, when in fact the value was ignored and the
   * session was ended.
   */
  const switchProfile = useCallback(async () => {
    await logout();
  }, [logout]);

  const updateSettings = useCallback(
    (partial: Partial<UserPreferences>) => {
      profileService.updateSettings(activeId, partial);
    },
    [activeId]
  );

  const toggleMyList = useCallback(
    (mediaId: string) => {
      return profileService.toggleMyList(activeId, mediaId);
    },
    [activeId]
  );

  const addToMyList = useCallback(
    (mediaId: string) => {
      profileService.addToMyList(activeId, mediaId);
    },
    [activeId]
  );

  const removeFromMyList = useCallback(
    (mediaId: string) => {
      profileService.removeFromMyList(activeId, mediaId);
    },
    [activeId]
  );

  const updateContinueWatching = useCallback(
    (item: ContinueWatchingItem) => {
      profileService.updateContinueWatching(activeId, item);
    },
    [activeId]
  );

  const removeFromContinueWatching = useCallback(
    (mediaId: string) => {
      profileService.removeFromContinueWatching(activeId, mediaId);
    },
    [activeId]
  );

  const addWatchHistory = useCallback(
    (item: Omit<WatchHistoryItem, 'id' | 'watchedAt'>) => {
      profileService.addWatchHistory(activeId, item);
    },
    [activeId]
  );

  const clearWatchHistory = useCallback(() => {
    profileService.clearWatchHistory(activeId);
  }, [activeId]);

  // Current active profile
  const profile: UserProfile =
    profileData?.profile || PROFILES[activeId] || PROFILES.guest || {
      id: activeId,
      name: activeId,
      title: 'Cinema Guest',
      avatarUrl: '/avatars/guest.svg',
      accentColor: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.35)',
      favoriteGenre: 'Cinema Hits',
      isOnline: true,
      isGuest: true,
    };

  const companionProfile: UserProfile =
    activeId === 'dinu' ? PROFILES.kanmani : PROFILES.dinu;

  const isCurrentOnline = presenceService.isProfileOnline(activeId);

  return {
    profile,
    profileId: activeId,
    companionProfile,
    allProfiles,
    presenceMap,
    isCurrentOnline,
    logout,
    switchProfile,
    isLoggingOut,
    isReady: true,
    data: profileData,
    continueWatching: profileData?.continueWatching || [],
    myList: profileData?.myList || [],
    watchHistory: profileData?.watchHistory || [],
    settings: profileData?.settings,
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
