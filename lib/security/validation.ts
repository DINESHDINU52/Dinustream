/**
 * DinuStream Input Sanitization & Security Validation Utilities
 */

/**
 * Validates media filenames to prevent directory traversal and injection attacks.
 * Disallows path separators, null bytes, double dots, and restricts characters.
 */
export function isValidFilename(filename: unknown): boolean {
  if (typeof filename !== 'string') return false;
  if (!filename || filename.length > 255) return false;
  if (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('\0')
  ) {
    return false;
  }
  return /^[a-zA-Z0-9_.\- ]+$/.test(filename);
}

/**
 * Validates media identifiers (UUID or kebab-case slugs).
 */
export function isValidMediaId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  if (!id || id.length > 100) return false;
  return /^[a-zA-Z0-9_\-]+$/.test(id);
}

/**
 * Validates Watch Group IDs.
 */
export function isValidGroupId(groupId: unknown): boolean {
  if (typeof groupId !== 'string') return false;
  if (!groupId || groupId.length > 64) return false;
  return /^[a-zA-Z0-9_\-]{3,64}$/.test(groupId);
}

/**
 * Validates external media/GIF URLs to prevent javascript:, data:, and XSS payloads.
 * Only allows valid https: URLs from reputable CDNs or valid image endpoints.
 */
export function isValidMediaUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.length > 2048) return false;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Allow known image/GIF hosts and generic safe HTTPS image patterns
    const allowedHosts = [
      'images.unsplash.com',
      'commondatastorage.googleapis.com',
      'media.giphy.com',
      'i.giphy.com',
      'media.tenor.com',
      'tenor.com',
    ];

    const host = parsed.hostname.toLowerCase();
    const isAllowedHost = allowedHosts.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );

    if (isAllowedHost) return true;

    // For other hosts, require standard image extensions to prevent arbitrary external embeds
    const pathname = parsed.pathname.toLowerCase();
    return /\.(gif|webp|png|jpg|jpeg|svg)$/.test(pathname);
  } catch {
    return false;
  }
}

/**
 * Sanitizes user input text: strips null bytes, control characters, and enforces length.
 */
export function sanitizeText(input: unknown, maxLength = 1000): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\0\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, maxLength);
}
