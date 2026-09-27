'use client';

import { UserProfile } from '@/types/cinema';
import { mapUserToProfile } from '@/lib/jellyfin/users';

export interface AuthStatus {
  authenticated: boolean;
  userId?: string;
  userName?: string;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
  userId?: string;
  userName?: string;
}

export const authService = {
  async status(): Promise<AuthStatus> {
    try {
      const res = await fetch('/api/auth/status', { credentials: 'include' });
      if (!res.ok) return { authenticated: false };
      return (await res.json()) as AuthStatus;
    } catch {
      return { authenticated: false };
    }
  },

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data.error || 'Login failed' };

      // The login route just set the dev ApiKey cookie — (re)connect the
      // realtime socket now that we can authenticate it.
      const { connectSyncPlaySocket } = await import('@/lib/jellyfin/syncPlaySocket');
      connectSyncPlaySocket();

      return { ok: true, userId: data.userId, userName: data.userName };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
    }
  },

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      /* ignore */
    }
  },

  /** Authenticated user as a DinuStream profile (via the same-origin proxy). */
  async currentProfile(): Promise<UserProfile | null> {
    try {
      const { fetchCurrentUser } = await import('@/lib/jellyfin/queries');
      const user = await fetchCurrentUser();
      return user ? mapUserToProfile(user) : null;
    } catch {
      return null;
    }
  },
};
