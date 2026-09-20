export interface ChatReaction {
  emoji: string;
  users: Array<'dinu' | 'kanmani'>;
  count: number;
}

export interface ChatReplyTo {
  id: string;
  senderId: 'dinu' | 'kanmani';
  senderName: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: 'dinu' | 'kanmani';
  senderName: string;
  senderAvatar: string;
  text: string;
  gifUrl?: string;
  replyTo?: ChatReplyTo;
  reactions: Record<string, ChatReaction>; // key: emoji
  timestamp: number; // epoch ms
  isOptimistic?: boolean;
}

export interface TypingState {
  dinu: boolean;
  kanmani: boolean;
}

export interface PresenceState {
  dinu: 'Online' | 'Offline';
  kanmani: 'Online' | 'Offline';
}
