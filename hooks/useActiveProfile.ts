'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserProfile, UserProfileId, ContinueWatchingItem } from '@/types/cinema';
import { UserPreferences, UserProfileData, WatchHistoryItem } from '@/types/profile';
import { profileService } from '@/lib/services/profileService';
import { PROFILES } from '@/lib/constants';

export function useActiveProfile() {
  const [activeId, setActiveId] = useState<UserProfileId>(() => profileService.getActiveProfileId());
  const [profileData, setProfileData] = useState<UserProfileData>(() =>
    profileService.getActiveProfileData()
  );

  useEffect(() => {
    const unsubscribe = profileService.subscribe(() => {
      const currentId = profileService.getActiveProfileId();
      setActiveId(currentId);
      setProfileData({ ...profileService.getActiveProfileData() });
    });
    return () => unsubscribe();
  }, []);

  const switchProfile = useCallback((newId: UserProfileId) => {
    profileService.switchProfile(newId);
  }, []);

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

  const profile: UserProfile = PROFILES[activeId];
  const companionProfile: UserProfile = activeId === 'dinu' ? PROFILES.kanmani : PROFILES.dinu;

  return {
    profile,
    profileId: activeId,
    companionProfile,
    switchProfile,
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
