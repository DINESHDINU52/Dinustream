import { WebSocketServer, WebSocket } from 'ws';
import { syncServerEngine, SyncCommand } from '@/lib/sync/syncServerEngine';
import { UserProfileId } from '@/types/cinema';
import { SyncEventPayload, SyncPlaybackSession } from '@/types/syncPlayback';

interface AuthenticatedSocket extends WebSocket {
  groupId?: string;
  userId?: UserProfileId;
  isAlive?: boolean;
}

let wssInstance: WebSocketServer | null = null;

export function getOrCreateWsSyncServer(port: number = Number(process.env.SYNC_WS_PORT) || 3002): WebSocketServer {
  if (wssInstance) return wssInstance;

  try {
    wssInstance = new WebSocketServer({ port });
    console.log(`[SYNC-WS] WebSocket Sync Server listening on port ${port}`);

    // Heartbeat check for stale connections
    const pingInterval = setInterval(() => {
      if (!wssInstance) return;
      wssInstance.clients.forEach((ws) => {
        const socket = ws as AuthenticatedSocket;
        if (socket.isAlive === false) {
          console.log(`[SYNC-WS] Terminating inactive socket for user ${socket.userId}`);
          return socket.terminate();
        }
        socket.isAlive = false;
        socket.ping();
      });
    }, 30000);

    wssInstance.on('close', () => {
      clearInterval(pingInterval);
    });

    wssInstance.on('connection', (ws: AuthenticatedSocket, req) => {
      const socket = ws;
      socket.isAlive = true;
      socket.on('pong', () => {
        socket.isAlive = true;
      });

      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const groupId = url.searchParams.get('groupId') || 'group-movie-night';
      const userId = (url.searchParams.get('userId') || 'dinu') as UserProfileId;

      socket.groupId = groupId;
      socket.userId = userId;

      console.log(`[SYNC-WS] Client connected: user=${userId} group=${groupId}`);

      // 1. Authenticate & validate
      const session = syncServerEngine.getSession(groupId);
      const serverNow = Date.now();

      // 2. Register join in authoritative engine
      const joinResult = syncServerEngine.handleCommand({
        type: 'JOIN',
        groupId,
        sender: userId,
      });

      // 3. Send authoritative session & expected position to new socket
      socket.send(
        JSON.stringify({
          type: 'INIT',
          session: joinResult.session,
          serverTimestamp: serverNow,
          expectedPosition: syncServerEngine.getExpectedPosition(joinResult.session, serverNow),
        })
      );

      // Handle incoming playback commands
      socket.on('message', (data) => {
        try {
          const raw = JSON.parse(data.toString());
          const cmd: SyncCommand = {
            type: raw.type,
            groupId: socket.groupId || groupId,
            sender: socket.userId || userId,
            mediaId: raw.mediaId,
            episodeId: raw.episodeId,
            position: raw.position,
            playbackState: raw.playbackState,
            message: raw.message,
            reactionEmoji: raw.reactionEmoji,
            latencyMs: raw.latencyMs,
            clientTimestamp: raw.clientTimestamp,
          };

          const result = syncServerEngine.handleCommand(cmd);
          if (!result.success) {
            socket.send(JSON.stringify({ type: 'ERROR', error: result.error }));
          }
        } catch (err) {
          console.error('[SYNC-WS] Error handling socket message:', err);
        }
      });

      socket.on('close', () => {
        console.log(`[SYNC-WS] Client disconnected: user=${socket.userId} group=${socket.groupId}`);
        if (socket.groupId && socket.userId) {
          syncServerEngine.handleCommand({
            type: 'LEAVE',
            groupId: socket.groupId,
            sender: socket.userId,
          });
        }
      });
    });

    // Subscribe to engine broadcasts and forward to matching group sockets
    syncServerEngine.subscribe('*', (event: SyncEventPayload, updatedSession: SyncPlaybackSession) => {
      broadcastToSockets(event.groupId, {
        type: 'EVENT',
        event,
        session: updatedSession,
        serverTimestamp: Date.now(),
      });
    });
  } catch (err) {
    console.warn('[SYNC-WS] Failed to start WebSocket server (may already be running or port restricted):', err);
  }

  return wssInstance!;
}

export function broadcastToSockets(groupId: string, payload: unknown) {
  if (!wssInstance) return;
  const msg = JSON.stringify(payload);
  wssInstance.clients.forEach((ws) => {
    const socket = ws as AuthenticatedSocket;
    if (socket.readyState === WebSocket.OPEN && socket.groupId === groupId) {
      socket.send(msg);
    }
  });
}
