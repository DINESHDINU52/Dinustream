'use client';

import { useEffect, useState, useCallback } from 'react';
import { SyncStatusResponse, getSyncStatus, startSync } from '@/lib/api/syncManager';

/** Poll the Python Sync Manager for a file's cache state. */
export function useSyncStatus(filename: string | null) {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (!filename) return;
    const s = await getSyncStatus(filename);
    setStatus(s);
  }, [filename]);

  useEffect(() => {
    if (!filename) {
      setStatus(null);
      return;
    }
    void refresh();
    const id = setInterval(() => void refresh(), 3000);
    return () => clearInterval(id);
  }, [filename, refresh]);

  const triggerSync = useCallback(async () => {
    if (!filename) return;
    setSyncing(true);
    await startSync(filename);
    await refresh();
    setSyncing(false);
  }, [filename, refresh]);

  return { status, triggerSync, syncing, refresh };
}
