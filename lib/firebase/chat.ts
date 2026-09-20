import {
  ChatMessage,
  ChatReaction,
  ChatReplyTo,
  TypingState,
  PresenceState,
} from '@/types/chat';
import { UserProfile } from '@/types/cinema';
import { firestore } from './config';
import { sanitizeText, isValidMediaUrl } from '@/lib/security/validation';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';

const DEFAULT_MESSAGES: Record<string, ChatMessage[]> = {
  'group-movie-night': [
    {
      id: 'msg-seed-1',
      groupId: 'group-movie-night',
      senderId: 'kanmani',
      senderName: 'Kanmani',
      senderAvatar: '/avatars/kanmani.png',
      text: 'Got the salted caramel popcorn ready! 🍿 Ready for the film ❤️',
      reactions: {
        '❤️': { emoji: '❤️', users: ['dinu'], count: 1 },
        '🍿': { emoji: '🍿', users: ['dinu', 'kanmani'], count: 2 },
      },
      timestamp: Date.now() - 1000 * 60 * 4,
    },
    {
      id: 'msg-seed-2',
      groupId: 'group-movie-night',
      senderId: 'dinu',
      senderName: 'Dinu',
      senderAvatar: '/avatars/dinu.png',
      text: 'Audio calibrated to Dolby Atmos TrueHD 7.1. Starting playback in 3... 2... 1... 🎬',
      reactions: {
        '🔥': { emoji: '🔥', users: ['kanmani'], count: 1 },
      },
      timestamp: Date.now() - 1000 * 60 * 2,
    },
  ],
};

class FirebaseChatService {
  private channels: Map<string, BroadcastChannel> = new Map();
  private messagesCache: Map<string, ChatMessage[]> = new Map();
  private typingCache: Map<string, TypingState> = new Map();
  private presenceCache: Map<string, PresenceState> = new Map();

  private getChannel(groupId: string): BroadcastChannel | null {
    if (typeof window === 'undefined') return null;
    if (!this.channels.has(groupId)) {
      try {
        const ch = new BroadcastChannel(`dinustream_chat_${groupId}`);
        this.channels.set(groupId, ch);
      } catch {
        return null;
      }
    }
    return this.channels.get(groupId) || null;
  }

  private getStoredMessages(groupId: string): ChatMessage[] {
    if (this.messagesCache.has(groupId)) {
      return this.messagesCache.get(groupId)!;
    }
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`dinustream_chat_msgs_${groupId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.messagesCache.set(groupId, parsed);
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    const initial = DEFAULT_MESSAGES[groupId] || [];
    this.messagesCache.set(groupId, initial);
    return initial;
  }

  private saveMessages(groupId: string, msgs: ChatMessage[]) {
    this.messagesCache.set(groupId, msgs);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`dinustream_chat_msgs_${groupId}`, JSON.stringify(msgs));
      } catch {
        // ignore
      }
    }
  }

  /**
   * Subscribe to live chat messages for a Watch Together group
   */
  public subscribeMessages(
    groupId: string,
    callback: (messages: ChatMessage[]) => void
  ): () => void {
    // 1. Try real Firestore subscription if available
    let unsubscribeFirestore: (() => void) | null = null;
    if (firestore) {
      try {
        const q = query(
          collection(firestore, 'watchGroups', groupId, 'messages'),
          orderBy('timestamp', 'asc')
        );
        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const list: ChatMessage[] = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...(docSnap.data() as Omit<ChatMessage, 'id'>),
            }));
            this.saveMessages(groupId, list);
            callback(list);
          }
        });
      } catch {
        // Fall through to resilient local real-time sync
      }
    }

    // 2. Local resilient real-time synchronization (BroadcastChannel + storage events)
    const channel = this.getChannel(groupId);
    const initialMessages = this.getStoredMessages(groupId);
    callback(initialMessages);

    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CHAT_MESSAGES_UPDATED') {
        const updated = this.getStoredMessages(groupId);
        callback(updated);
      }
    };

    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `dinustream_chat_msgs_${groupId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.messagesCache.set(groupId, parsed);
          callback(parsed);
        } catch {
          // ignore
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
    };
  }

  /**
   * Send a new message to the group chat
   */
  public async sendMessage(
    groupId: string,
    sender: UserProfile,
    text: string,
    gifUrl?: string,
    replyTo?: ChatReplyTo
  ): Promise<ChatMessage> {
    const sanitizedText = sanitizeText(text, 1000);
    const safeGifUrl = isValidMediaUrl(gifUrl) ? gifUrl : undefined;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      groupId,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatarUrl,
      text: sanitizedText,
      gifUrl: safeGifUrl,
      replyTo,
      reactions: {},
      timestamp: Date.now(),
    };

    // 1. Try Firestore
    if (firestore) {
      try {
        await addDoc(
          collection(firestore, 'watchGroups', groupId, 'messages'),
          newMessage
        );
      } catch {
        // Handled below
      }
    }

    // 2. Real-time broadcast
    const current = this.getStoredMessages(groupId);
    const updated = [...current, newMessage];
    this.saveMessages(groupId, updated);

    const channel = this.getChannel(groupId);
    if (channel) {
      channel.postMessage({ type: 'CHAT_MESSAGES_UPDATED', groupId });
    }

    return newMessage;
  }

  /**
   * Add or toggle an emoji reaction on a message
   */
  public async toggleReaction(
    groupId: string,
    messageId: string,
    emoji: string,
    userId: 'dinu' | 'kanmani'
  ): Promise<void> {
    const messages = this.getStoredMessages(groupId);
    const targetMsg = messages.find((m) => m.id === messageId);
    if (!targetMsg) return;

    if (!targetMsg.reactions) {
      targetMsg.reactions = {};
    }

    const currentReaction: ChatReaction = targetMsg.reactions[emoji] || {
      emoji,
      users: [],
      count: 0,
    };

    const hasUserReacted = currentReaction.users.includes(userId);
    if (hasUserReacted) {
      // Remove reaction
      currentReaction.users = currentReaction.users.filter((u) => u !== userId);
      currentReaction.count = Math.max(0, currentReaction.count - 1);
      if (currentReaction.count === 0) {
        delete targetMsg.reactions[emoji];
      } else {
        targetMsg.reactions[emoji] = currentReaction;
      }
    } else {
      // Add reaction
      currentReaction.users.push(userId);
      currentReaction.count += 1;
      targetMsg.reactions[emoji] = currentReaction;
    }

    // 1. Try Firestore update
    if (firestore) {
      try {
        const msgDoc = doc(firestore, 'watchGroups', groupId, 'messages', messageId);
        await updateDoc(msgDoc, { reactions: targetMsg.reactions });
      } catch {
        // Fallback
      }
    }

    this.saveMessages(groupId, messages);
    const channel = this.getChannel(groupId);
    if (channel) {
      channel.postMessage({ type: 'CHAT_MESSAGES_UPDATED', groupId });
    }
  }

  /**
   * Set user typing status
   */
  public async setTyping(
    groupId: string,
    userId: 'dinu' | 'kanmani',
    isTyping: boolean
  ): Promise<void> {
    const channel = this.getChannel(groupId);
    if (channel) {
      channel.postMessage({
        type: 'TYPING_UPDATE',
        groupId,
        userId,
        isTyping,
      });
    }
  }

  /**
   * Subscribe to typing indicators
   */
  public subscribeTyping(
    groupId: string,
    callback: (typing: TypingState) => void
  ): () => void {
    const current: TypingState = this.typingCache.get(groupId) || {
      dinu: false,
      kanmani: false,
    };
    callback(current);

    const channel = this.getChannel(groupId);
    const timeouts: Record<string, NodeJS.Timeout> = {};

    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TYPING_UPDATE' && event.data.groupId === groupId) {
        const { userId, isTyping } = event.data;
        current[userId as 'dinu' | 'kanmani'] = isTyping;
        callback({ ...current });

        if (isTyping) {
          if (timeouts[userId]) clearTimeout(timeouts[userId]);
          timeouts[userId] = setTimeout(() => {
            current[userId as 'dinu' | 'kanmani'] = false;
            callback({ ...current });
          }, 3500);
        }
      }
    };

    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
      }
      Object.values(timeouts).forEach(clearTimeout);
    };
  }

  /**
   * Update online presence for Watch Together chat
   */
  public async updatePresence(
    groupId: string,
    userId: 'dinu' | 'kanmani',
    status: 'Online' | 'Offline'
  ): Promise<void> {
    const channel = this.getChannel(groupId);
    if (channel) {
      channel.postMessage({
        type: 'PRESENCE_UPDATE',
        groupId,
        userId,
        status,
      });
    }
  }

  /**
   * Subscribe to online presence
   */
  public subscribePresence(
    groupId: string,
    callback: (presence: PresenceState) => void
  ): () => void {
    const current: PresenceState = this.presenceCache.get(groupId) || {
      dinu: 'Online',
      kanmani: 'Online',
    };
    callback(current);

    const channel = this.getChannel(groupId);
    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PRESENCE_UPDATE' && event.data.groupId === groupId) {
        const { userId, status } = event.data;
        current[userId as 'dinu' | 'kanmani'] = status;
        this.presenceCache.set(groupId, current);
        callback({ ...current });
      }
    };

    if (channel) {
      channel.addEventListener('message', handleChannelMessage);
    }

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
      }
    };
  }
}

export const firebaseChat = new FirebaseChatService();
