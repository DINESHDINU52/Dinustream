import { NextRequest } from 'next/server';
import { syncServerEngine } from '@/lib/sync/syncServerEngine';
import { SyncEventPayload, SyncPlaybackSession } from '@/types/syncPlayback';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId') || 'group-movie-night';
  const userId = searchParams.get('userId') || 'dinu';

  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // 1. Send initial session state immediately upon connection
      const session = syncServerEngine.getSession(groupId);
      const serverNow = Date.now();
      const initialPayload = {
        type: 'INIT',
        session,
        serverTimestamp: serverNow,
        expectedPosition: syncServerEngine.getExpectedPosition(session, serverNow),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialPayload)}\n\n`));

      // 2. Subscribe to server engine's authoritative broadcasts
      unsubscribe = syncServerEngine.subscribe(
        groupId,
        (event: SyncEventPayload, updatedSession: SyncPlaybackSession) => {
          try {
            const data = {
              type: 'EVENT',
              event,
              session: updatedSession,
              serverTimestamp: Date.now(),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch (e) {
            console.warn(`[SYNC-SSE] Error enqueueing event for group ${groupId}:`, e);
          }
        }
      );

      // 3. Keep-alive heartbeat every 15s to keep connection active across proxies/firewalls
      keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (keepAliveTimer) clearInterval(keepAliveTimer);
        }
      }, 15000);
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      // Notify server of disconnect
      syncServerEngine.handleCommand({
        type: 'HEARTBEAT',
        groupId,
        sender: userId as any,
        playbackState: 'PAUSED',
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
