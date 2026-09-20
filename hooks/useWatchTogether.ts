'use client';

import { useState, useEffect, useCallback } from 'react';
import { WatchGroup } from '@/types/watchTogether';
import { watchTogetherService } from '@/lib/services/watchTogetherService';
import { MediaItem } from '@/types/cinema';

export function useWatchTogether() {
  const [group, setGroup] = useState<WatchGroup | null>(() => watchTogetherService.getGroup());

  useEffect(() => {
    const unsubscribe = watchTogetherService.subscribe((updatedGroup) => {
      setGroup(updatedGroup ? { ...updatedGroup } : null);
    });
    return () => unsubscribe();
  }, []);

  const createGroup = useCallback((name?: string, hostId?: 'dinu' | 'kanmani') => {
    return watchTogetherService.createGroup(name, hostId);
  }, []);

  const selectMovie = useCallback((movie: MediaItem) => {
    watchTogetherService.selectMovie(movie);
  }, []);

  const addToQueue = useCallback((movie: MediaItem, addedBy?: 'dinu' | 'kanmani') => {
    watchTogetherService.addToQueue(movie, addedBy);
  }, []);

  const removeFromQueue = useCallback((queueIdOrMovieId: string) => {
    watchTogetherService.removeFromQueue(queueIdOrMovieId);
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    watchTogetherService.reorderQueue(fromIndex, toIndex);
  }, []);

  const clearQueue = useCallback(() => {
    watchTogetherService.clearQueue();
  }, []);

  const playNext = useCallback((onLaunch?: (movieId: string, groupId: string) => void) => {
    watchTogetherService.playNext(onLaunch);
  }, []);

  const prepareNextQueuedMovie = useCallback(() => {
    return watchTogetherService.prepareNextQueuedMovie();
  }, []);

  const toggleParticipantReady = useCallback((participantId: 'dinu' | 'kanmani') => {
    watchTogetherService.toggleParticipantReady(participantId);
  }, []);

  const switchHost = useCallback((newHostId: 'dinu' | 'kanmani') => {
    watchTogetherService.switchHost(newHostId);
  }, []);

  const startSyncAndPlay = useCallback(
    (onReadyToLaunch: (movieId: string, groupId: string) => void) => {
      return watchTogetherService.startSyncAndPlay(onReadyToLaunch);
    },
    []
  );

  const updatePlaybackState = useCallback((position: number, isPlaying: boolean) => {
    watchTogetherService.updatePlaybackState(position, isPlaying);
  }, []);

  const resetGroup = useCallback(() => {
    watchTogetherService.resetGroup();
  }, []);

  return {
    group,
    createGroup,
    selectMovie,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    playNext,
    prepareNextQueuedMovie,
    toggleParticipantReady,
    switchHost,
    startSyncAndPlay,
    updatePlaybackState,
    resetGroup,
  };
}
