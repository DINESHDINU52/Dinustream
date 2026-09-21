/**
 * Runtime-agnostic session payload helpers.
 *
 * This module is deliberately free of any Node built-in so it can be imported
 * from the Edge Middleware bundle. Signing and signature verification need
 * `node:crypto` and therefore live in ./session.ts, which must only ever be
 * imported from Node-runtime code (route handlers).
 *
 * Splitting them is not cosmetic: `middleware.ts` only needs the cookie name
 * and the payload decoder, but while both lived in one file the HMAC import was
 * dragged into the Edge bundle, which the Edge runtime cannot load.
 */

export interface SessionData {
  profileId: string;
  name?: string;
  issuedAt: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'dinustream_session';

/** Session lifetime. */
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64url');
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(b64url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64url, 'base64url').toString('utf-8');
  }
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64);
}

/**
 * Decode and sanity-check a session token's payload.
 *
 * IMPORTANT: this does **not** check the HMAC signature — it only confirms the
 * token is well-formed and unexpired. Use `verifySessionToken` from
 * ./session.ts wherever the token's authenticity actually matters.
 */
export function parseSessionPayload(token: string): SessionData | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64] = parts;
    const data: SessionData = JSON.parse(fromBase64Url(payloadB64));

    if (!data.exp || Date.now() > data.exp) return null;
    if (!data.profileId || typeof data.profileId !== 'string') return null;

    return data;
  } catch {
    return null;
  }
}
