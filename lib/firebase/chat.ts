import { ChatMessage, ChatReplyTo, TypingState, PresenceState, ChatReaction } from '@/types/chat';
import { UserProfile, UserProfileId } from '@/types/cinema';
import { MOCK_CHAT_MESSAGES } from '@/lib/mock-data';

let messagesStore: ChatMessage[] = [...MOCK_CHAT_MESSAGES];
let typingStore: TypingState = { dinu: false, kanmani: false };
let presenceStore: PresenceState = { dinu: 'Online', kanmani: 'Online' };

const messageListeners = new Set<(msgs: ChatMessage[]) => void>();
const typingListeners = new Set<(t: TypingState) => void>();
const presenceListeners = new Set<(p: PresenceState) => void>();

export const firebaseChat = {
  subscribeMessages(groupId: string, callback: (msgs: ChatMessage[]) => void): () => void {
    callback(messagesStore);
    messageListeners.add(callback);
    return () => {
      messageListeners.delete(callback);
    };
  },

  subscribeTyping(groupId: string, callback: (t: TypingState) => void): () => void {
    callback(typingStore);
    typingListeners.add(callback);
    return () => {
      typingListeners.delete(callback);
    };
  },

  subscribePresence(groupId: string, callback: (p: PresenceState) => void): () => void {
    callback(presenceStore);
    presenceListeners.add(callback);
    return () => {
      presenceListeners.delete(callback);
    };
  },

  async sendMessage(
    groupId: string,
    profile: UserProfile,
    text: string,
    gifUrl?: string,
    replyTo?: ChatReplyTo
  ): Promise<void> {
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      groupId,
      senderId: profile.id,
      senderName: profile.name,
      senderAvatar: profile.avatarUrl,
      text,
      gifUrl,
      replyTo,
      timestamp: Date.now(),
      reactions: {},
    };
    messagesStore = [...messagesStore, newMsg];
    messageListeners.forEach((fn) => fn(messagesStore));

    // Optional simulated reply from companion
    if (profile.id === 'dinu') {
      setTimeout(() => {
        const replies = [
          'Agreed! The sound design in this scene is immaculate.',
          'Haha yes, wait until you see the next sequence! 🔥',
          'Watching together is so much better!',
        ];
        const companionMsg: ChatMessage = {
          id: 'msg-' + Date.now(),
          groupId,
          senderId: 'kanmani',
          senderName: 'Kanmani',
          senderAvatar: '/avatars/characters/spider-man.svg',
          text: replies[Math.floor(Math.random() * replies.length)],
          timestamp: Date.now(),
          reactions: {
            '❤️': { emoji: '❤️', users: ['kanmani'], count: 1 },
          },
        };
        messagesStore = [...messagesStore, companionMsg];
        messageListeners.forEach((fn) => fn(messagesStore));
      }, 1500);
    }
  },

  async toggleReaction(
    groupId: string,
    messageId: string,
    emoji: string,
    userId: UserProfileId
  ): Promise<void> {
    messagesStore = messagesStore.map((msg) => {
      if (msg.id !== messageId) return msg;
      const reactions = { ...(msg.reactions || {}) };
      const current = reactions[emoji];
      if (current && current.users.includes(userId)) {
        const updatedUsers = current.users.filter((u) => u !== userId);
        if (updatedUsers.length === 0) {
          delete reactions[emoji];
        } else {
          reactions[emoji] = { emoji, users: updatedUsers, count: updatedUsers.length };
        }
      } else {
        const nextUsers = current ? [...current.users, userId] : [userId];
        reactions[emoji] = { emoji, users: nextUsers, count: nextUsers.length };
      }
      return { ...msg, reactions };
    });
    messageListeners.forEach((fn) => fn(messagesStore));
  },

  async setTyping(groupId: string, userId: string, isTyping: boolean): Promise<void> {
    typingStore = { ...typingStore, [userId]: isTyping };
    typingListeners.forEach((fn) => fn(typingStore));
  },
};
