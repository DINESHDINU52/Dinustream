'use client';

// Singleton WebSocket to the Jellyfin server for realtime events (SyncPlay
// commands + group updates). One connection is shared across all subscribers,
// with exponential-backoff reconnection.
//
// Auth:
//   - production: same-origin /jellyfin/socket — nginx injects the MediaBrowser
//     Authorization header from the httpOnly cookie on the Upgrade request.
//   - dev: Next route handlers cannot upgrade WebSockets, so we connect straight
//     to the server and pass the token as ?ApiKey=. The login route sets a
//     non-httpOnly `jf_apikey` cookie in dev only to make this possible.

import { getServerUrl, JELLYFIN_API_KEY_COOKIE } from './client';

export interface SyncPlayCommandData {
  GroupId: string;
  PlaylistItemId: string;
  When: string;
  PositionTicks: number | null;
  Command: string; // 'Unpause' | 'Pause' | 'Stop' | 'Seek'
  EmittedAt: string;
}

export interface SyncPlayGroupUpdateData {
  Type: string; // 'UserJoined' | 'UserLeft' | 'GroupJoined' | 'StateUpdate' | 'PlayQueue' | ...
  GroupId: string;
  Data: unknown;
}

export interface SyncPlaySocketMessage {
  MessageType: string;
  Data?: SyncPlayCommandData | SyncPlayGroupUpdateData | unknown;
  [key: string]: unknown;
}

type Listener = (message: SyncPlaySocketMessage) => void;

const listeners = new Set<Listener>();
let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let manuallyClosed = false;
let reconnectDelay = 2000;
let warnedMissingApiKey = false;

const MAX_RECONNECT_DELAY = 30_000;

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const c = part.trim();
    if (c.startsWith(prefix)) return decodeURIComponent(c.slice(prefix.length));
  }
  return '';
}

function buildSocketUrl(): string | null {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const proto = secure ? 'wss' : 'ws';

  if (process.env.NODE_ENV === 'production') {
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
    return `${proto}://${host}/jellyfin/socket`;
  }

  // Dev fallback: direct + ApiKey. If there's no key yet (not logged in), we
  // decline to connect rather than spam failed WebSocket errors.
  const apiKey = readCookie(JELLYFIN_API_KEY_COOKIE);
  if (!apiKey) {
    if (!warnedMissingApiKey) {
      console.info('[SyncPlay] No session yet — WebSocket will connect after login.');
      warnedMissingApiKey = true;
    }
    return null;
  }
  const server = getServerUrl();
  const host = server.replace(/^https?:\/\//, '');
  return `${proto}://${host}/socket?ApiKey=${encodeURIComponent(apiKey)}`;
}

function dispatch(message: SyncPlaySocketMessage) {
  listeners.forEach((l) => l(message));
}

function scheduleReconnect() {
  if (reconnectTimer || manuallyClosed) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectSyncPlaySocket();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
}

export function connectSyncPlaySocket(): WebSocket | null {
  if (typeof window === 'undefined') return null;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  manuallyClosed = false;
  const url = buildSocketUrl();
  if (!url) return null;

  const ws = new WebSocket(url);
  socket = ws;

  ws.onopen = () => {
    reconnectDelay = 2000;
    warnedMissingApiKey = false;
    // Subscribe to session events (harmless; SyncPlay updates are pushed
    // automatically to this session once we join a group).
    ws.send(JSON.stringify({ MessageType: 'SessionsStart', Data: '0,500' }));
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data as string) as SyncPlaySocketMessage;
      dispatch(message);
    } catch {
      /* ignore malformed frames */
    }
  };

  ws.onclose = () => {
    if (socket === ws) socket = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws.close();
  };

  return ws;
}

export function subscribeSyncPlay(listener: Listener): () => void {
  listeners.add(listener);
  connectSyncPlaySocket();
  return () => {
    listeners.delete(listener);
  };
}

export function closeSyncPlaySocket() {
  manuallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
}