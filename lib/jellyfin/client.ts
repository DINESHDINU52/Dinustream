// Jellyfin client core — URL building, auth header, cookie helpers, fetch wrapper.
//
// Auth model (12.1 — legacy X-Emby-Token / ?api_key= / Bearer are DISABLED):
//   - Login sets `jf_token` + `jf_user_id` as httpOnly cookies (server-side).
//   - `jf_device` is a stable per-browser device id (readable by nginx).
//   - nginx injects the `Authorization: MediaBrowser ...` header in production.
//   - The Next.js route handler at app/jellyfin/[...path]/route.ts does the same
//     in local dev, so client code is identical everywhere.
//
// Client code therefore NEVER handles a raw token — it just calls fetch on the
// same-origin `/jellyfin/*` path with credentials included.

export const CLIENT_NAME = 'DinuStream';
export const DEVICE_NAME = 'Web';
export const CLIENT_VERSION = '1.0.0';
export const TICKS_PER_SECOND = 10_000_000;

export const JELLYFIN_TOKEN_COOKIE = 'jf_token';
export const JELLYFIN_USER_COOKIE = 'jf_user_id';
export const JELLYFIN_DEVICE_COOKIE = 'jf_device';
/** Dev-only non-httpOnly copy of the token, used to auth the WebSocket (?ApiKey). */
export const JELLYFIN_API_KEY_COOKIE = 'jf_apikey';

/** Base path the browser uses (same-origin, always `/jellyfin`). */
export function getJellyfinBaseUrl(): string {
  return process.env.NEXT_PUBLIC_JELLYFIN_URL || '/jellyfin';
}

/** Absolute loopback URL used by server-side route handlers only. */
export function getServerUrl(): string {
  return process.env.JELLYFIN_SERVER_URL || 'http://127.0.0.1:8096';
}

export function buildAuthHeader(token: string, deviceId: string): string {
  return [
    `MediaBrowser Client="${CLIENT_NAME}"`,
    `Device="${DEVICE_NAME}"`,
    `DeviceId="${deviceId}"`,
    `Version="${CLIENT_VERSION}"`,
    `Token="${token}"`,
  ].join(', ');
}

/** Build the same-origin URL for a Jellyfin API/media path. */
export function jfUrl(path: string): string {
  const base = getJellyfinBaseUrl();
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const c = part.trim();
    if (c.startsWith(prefix)) return decodeURIComponent(c.slice(prefix.length));
  }
  return '';
}

/** Current Jellyfin user id, if logged in. */
export function getUserId(): string {
  return readCookie(JELLYFIN_USER_COOKIE);
}

/** True when an httpOnly token cookie exists (best-effort client check). */
export function hasSessionCookie(): boolean {
  return readCookie(JELLYFIN_USER_COOKIE).length > 0;
}

export class JellyfinError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'JellyfinError';
  }
}

/**
 * Fetch a Jellyfin endpoint through the same-origin proxy.
 * The auth header is added server-side (route handler in dev, nginx in prod),
 * so this just needs credentials: 'include'.
 */
export async function jfFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(jfUrl(path), {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new JellyfinError(res.status, text.slice(0, 300));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
