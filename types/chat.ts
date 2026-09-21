import { UserProfileId } from './cinema';
export interface ChatReaction {
  emoji: string;
  users: UserProfileId[];
  count: number;
}

export interface ChatReplyTo {
  id: string;
  senderId: UserProfileId;
  senderName: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: UserProfileId;
  senderName: string;
  senderAvatar: string;
  text: string;
  gifUrl?: string;
  replyTo?: ChatReplyTo;
  reactions: Record<string, ChatReaction>; // key: emoji
  timestamp: number; // epoch ms
  isOptimistic?: boolean;
}

export type TypingState = Record<string, boolean>;

export type ParticipantPresence =
  | 'Online'
  | 'Watching'
  | 'Paused'
  | 'Buffering'
  | 'Offline';

export type PresenceState = Record<string, ParticipantPresence>;
