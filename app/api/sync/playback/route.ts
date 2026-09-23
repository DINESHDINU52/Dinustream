import { NextRequest, NextResponse } from 'next/server';
import { syncServerEngine, SyncCommand } from '@/lib/sync/syncServerEngine';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId') || 'group-movie-night';
  const mediaId = searchParams.get('mediaId') || undefined;

  const session = syncServerEngine.getSession(groupId, mediaId);
  const serverNow = Date.now();
  const expectedPosition = syncServerEngine.getExpectedPosition(session, serverNow);

  return NextResponse.json({
    success: true,
    session,
    expectedPosition,
    serverTimestamp: serverNow,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cmd: SyncCommand = {
      type: body.type,
      groupId: body.groupId,
      sender: body.sender,
      mediaId: body.mediaId,
      episodeId: body.episodeId,
      position: typeof body.position === 'number' ? body.position : undefined,
      playbackState: body.playbackState,
      message: body.message,
      reactionEmoji: body.reactionEmoji,
      latencyMs: body.latencyMs,
      clientTimestamp: body.clientTimestamp,
    };

    const result = syncServerEngine.handleCommand(cmd);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Sync command rejected' }, { status: 400 });
    }

    const serverNow = Date.now();
    return NextResponse.json({
      success: true,
      session: result.session,
      event: result.event,
      serverTimestamp: serverNow,
      expectedPosition: syncServerEngine.getExpectedPosition(result.session, serverNow),
    });
  } catch (err) {
    console.error('[SYNC] Failed to process sync command:', err);
    return NextResponse.json({ error: 'Internal server error processing command' }, { status: 500 });
  }
}
