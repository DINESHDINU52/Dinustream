/**
 * Node-runtime session token signing and verification.
 *
 * `node:crypto` is imported statically rather than pulled in with `require()`
 * inside each function. The old inline `require('crypto')` calls were both a
 * lint error (@typescript-eslint/no-require-imports) and a bundling hazard: a
 * bare `require` is not statically analysable, so the bundler could not tell
 * this file is Node-only.
 *
 * Because of that import, this module must only be imported from Node-runtime
 * code (route handlers). Edge Middleware should import the payload helpers from
 * ./session-payload instead.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  SESSION_DURATION_MS,
  parseSessionPayload,
  toBase64Url,
  type SessionData,
} from './session-payload';

// Re-exported so existing `@/lib/security/session` imports keep working.
export {
  SESSION_COOKIE_NAME,
  SESSION_DURATION_MS,
  parseSessionPayload,
  type SessionData,
} from './session-payload';

function getSecretKey(): string {
  return (
    process.env.ADMIN_MASTER_PIN ||
    process.env.SYNC_MANAGER_API_KEY ||
    'dinustream-cinema-secret-key-prod'
  );
}

function sign(payloadB64: string): string {
  return createHmac('sha256', getSecretKey()).update(payloadB64).digest('base64url');
}

/** Issue a signed `<payload>.<signature>` session token. */
export function createSessionToken(profileId: string, name?: string): string {
  const now = Date.now();
  const payload: SessionData = {
    profileId,
    name,
    issuedAt: now,
    exp: now + SESSION_DURATION_MS,
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verify a token's HMAC signature and return its payload, or `null`.
 *
 * This is the only function that proves a token was issued by this server;
 * `parseSessionPayload` alone just decodes whatever the client sent.
 */
export function verifySessionToken(token: string): SessionData | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSig = sign(payloadB64);

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    /* Length is compared first because `timingSafeEqual` throws on a length
       mismatch rather than returning false. */
    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    return parseSessionPayload(token);
  } catch {
    return null;
  }
}
