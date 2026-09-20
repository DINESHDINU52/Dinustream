export interface SessionData {
  profileId: 'dinu' | 'kanmani';
  issuedAt: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'dinustream_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecretKey(): string {
  return process.env.ADMIN_MASTER_PIN || process.env.SYNC_MANAGER_API_KEY || 'dinustream-cinema-secret-key-prod';
}

// Simple base64url encode/decode compatible with both Edge and Node
function toBase64Url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64url');
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64url, 'base64url').toString('utf-8');
  }
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64);
}

// Standard SHA256 HMAC for Node.js
export function createSessionToken(profileId: 'dinu' | 'kanmani'): string {
  const secret = getSecretKey();
  const now = Date.now();
  const payload: SessionData = {
    profileId,
    issuedAt: now,
    exp: now + SESSION_DURATION_MS,
  };
  const jsonStr = JSON.stringify(payload);
  const payloadB64 = toBase64Url(jsonStr);

  // We can use node:crypto or simple signature
  // Using standard HMAC SHA-256 via Web Crypto or Node crypto
  const nodeCrypto = require('crypto');
  const signature = nodeCrypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function parseSessionPayload(token: string): SessionData | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64] = parts;
    const jsonStr = fromBase64Url(payloadB64);
    const data: SessionData = JSON.parse(jsonStr);
    if (!data.exp || Date.now() > data.exp) return null;
    if (data.profileId !== 'dinu' && data.profileId !== 'kanmani') return null;
    return data;
  } catch {
    return null;
  }
}

export function verifySessionToken(token: string): SessionData | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;
    const secret = getSecretKey();

    const nodeCrypto = require('crypto');
    const expectedSig = nodeCrypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !nodeCrypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const data = parseSessionPayload(token);
    return data;
  } catch {
    return null;
  }
}
