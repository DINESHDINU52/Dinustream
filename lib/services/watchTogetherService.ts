import { WatchGroup, QueuedMovie, FloatingReactionEvent, QuickReactionEmoji, WatchGroupParticipant } from '@/types/watchTogether';
import { UserProfileId } from '@/types/cinema';
import { MOCK_WATCH_GROUP } from '@/lib/mock-data';
import { syncPlay } from '@/lib/jellyfin/syncPlay';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';

function namesToParticipants(names: string[]): WatchGroupParticipant[] {
  return names.map((name, i) => ({
    id: name,
    name,
    avatarUrl: '/avatars/characters/grogu.svg',
    isHost: i === 0,
    isOnline: true,
    isReady: true,
    statusText: 'In screening room',
  }));
}

export const watchTogetherService = {
  async getActiveGroup(): Promise<WatchGroup> {
    if (DEMO) return MOCK_WATCH_GROUP;
    try {
      const groups = await syncPlay.listGroups();
      if (groups.length > 0) {
        const g = groups[0];
        return {
          ...MOCK_WATCH_GROUP,
          id: g.GroupId,
          name: g.GroupName,
          state: g.State === 'Playing' ? 'PLAYING' : g.State === 'Paused' ? 'PAUSED' : 'WAITING',
          participants: namesToParticipants(g.Participants),
          isPlaying: g.State === 'Playing',
          jellyfinSyncPlayGroupId: g.GroupId,
        };
      }
    } catch {
      /* not in a group */
    }
    return MOCK_WATCH_GROUP;
  },

  async joinGroup(groupId: string, _userId: UserProfileId): Promise<WatchGroup> {
    if (!DEMO) await syncPlay.joinGroup(groupId).catch(() => {});
    return { ...MOCK_WATCH_GROUP, id: groupId, jellyfinSyncPlayGroupId: groupId };
  },

  async addToQueue(movie: QueuedMovie): Promise<void> {
    if (!DEMO) await syncPlay.queue([movie.movieId], 'Queue').catch(() => {});
    MOCK_WATCH_GROUP.queue.push(movie);
  },

  async removeFromQueue(queueId: string): Promise<void> {
    MOCK_WATCH_GROUP.queue = MOCK_WATCH_GROUP.queue.filter((q) => q.id !== queueId);
    // Best-effort server removal is handled by the lobby hook (it maps the local
    // queue entry back to the SyncPlay playlist item id).
  },

  prepareNextQueuedMovie(): QueuedMovie | null {
    if (MOCK_WATCH_GROUP.queue.length === 0) return null;
    const [next, ...rest] = MOCK_WATCH_GROUP.queue;
    MOCK_WATCH_GROUP.queue = rest;
    return next;
  },

  sendReaction(emoji: QuickReactionEmoji, senderId: UserProfileId): FloatingReactionEvent {
    return {
      id: 'reaction-' + Date.now(),
      emoji,
      senderId,
      senderName: senderId === 'dinu' ? 'Dinu' : 'Kanmani',
      timestamp: Date.now(),
      xOffsetPercent: Math.random() * 80 + 10,
    };
  },
};