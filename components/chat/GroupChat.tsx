'use client';

import { UserProfileId } from '@/types/cinema';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage as ChatMessageType, ChatReplyTo, TypingState, PresenceState } from '@/types/chat';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { firebaseChat } from '@/lib/firebase/chat';
import { useTVNavigation } from '@/hooks/useTVNavigation';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { UnreadIndicator } from './UnreadIndicator';
import { MessageSquare, X, Lock, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupChatProps {
  groupId?: string;
  groupName?: string;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
  className?: string;
}

export function GroupChat({
  groupId = 'group-movie-night',
  groupName = 'Movie Night ❤️',
  isOpen: controlledIsOpen,
  onToggleOpen,
  className = '',
}: GroupChatProps) {
  const { profile } = useActiveProfile();
  const { isTVMode } = useTVNavigation();
  const { isMobile } = useDeviceOrientation();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [forceFullChat, setForceFullChat] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const isTVCompact = isTVMode && !forceFullChat;

  const setIsOpen = (nextOpen: boolean) => {
    if (nextOpen) {
      setUnreadCount(0);
    }
    if (onToggleOpen) {
      onToggleOpen(nextOpen);
    } else {
      setInternalIsOpen(nextOpen);
    }
  };

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyTo, setReplyTo] = useState<ChatReplyTo | null>(null);
  const [typing, setTyping] = useState<TypingState>({ dinu: false, kanmani: false });
  const [presence, setPresence] = useState<PresenceState>({ dinu: 'Online', kanmani: 'Online' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to Firebase / real-time messages
  useEffect(() => {
    const unsubMessages = firebaseChat.subscribeMessages(groupId, (msgs) => {
      setMessages(msgs);
      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    });

    const unsubTyping = firebaseChat.subscribeTyping(groupId, (t) => {
      setTyping(t);
    });

    const unsubPresence = firebaseChat.subscribePresence(groupId, (p) => {
      setPresence(p);
    });

    return () => {
      unsubMessages();
      unsubTyping();
      unsubPresence();
    };
  }, [groupId, isOpen]);


  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, typing]);

  const handleSendMessage = async (text: string, gifUrl?: string) => {
    await firebaseChat.sendMessage(groupId, profile, text, gifUrl, replyTo || undefined);
    setReplyTo(null);
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    await firebaseChat.toggleReaction(groupId, messageId, emoji, profile.id);
  };

  const handleTyping = async (isTyping: boolean) => {
    await firebaseChat.setTyping(groupId, profile.id, isTyping);
  };

  const otherUserId: UserProfileId = profile.id === 'dinu' ? 'kanmani' : 'dinu';
  const otherUserName = otherUserId === 'dinu' ? 'Dinu' : 'Kanmani';
  const isOtherUserTyping = typing[otherUserId];

  return (
    <>
      {/* 1. Floating Chat Trigger Button (Rendered when closed) */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 p-3.5 rounded-full bg-[#0e1626]/90 hover:bg-[#152038] text-white border border-white/[0.14] shadow-[0_8px_30px_rgba(0,0,0,0.85)] backdrop-blur-lg flex items-center gap-2 group transition-all cinema-focus ${className}`}
          title="Open Watch Together Chat"
          aria-label="Open Watch Together Chat"
          id="btn-open-group-chat"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-sky-400 fill-sky-400/20 group-hover:fill-sky-400 transition-colors" />
            <UnreadIndicator count={unreadCount} />
          </div>
          <span className="text-xs font-semibold pr-1 hidden sm:inline">
            Chat
          </span>
        </motion.button>
      )}

      {/* 2. Chat Presentation: TV Compact Mode vs Mobile Bottom Sheet vs Desktop Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 z-40 bg-black/20 pointer-events-none"
              aria-hidden="true"
            />

            {isTVCompact ? (
              /* TV Compact Mode (Non-intrusive floating HUD for 10-foot viewing) */
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed bottom-24 right-8 z-50 w-88 max-w-[calc(100vw-3rem)] rounded-2xl bg-[#080d17]/90 backdrop-blur-2xl border border-white/[0.18] shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-4 flex flex-col gap-3 cinema-focus"
                id="group-chat-tv-compact"
              >
                {/* TV Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🍿</span>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide">{groupName}</h3>
                      <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                          Dinu & Kanmani
                        </span>
                        <span>•</span>
                        <span className="text-sky-400 font-semibold">TV Mode</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setForceFullChat(true)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.1] cinema-focus transition-colors"
                      title="Expand to Full Chat"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.1] cinema-focus transition-colors"
                      title="Close"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* TV Messages Feed (Last 3 messages) */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {messages.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2 text-center">No messages yet. Send a reaction!</p>
                  ) : (
                    messages.slice(-3).map((msg) => (
                      <div key={msg.id} className="text-xs bg-white/[0.05] rounded-lg px-2.5 py-1.5 flex items-start gap-1.5 border border-white/[0.04]">
                        <span className={cn('font-bold text-[11px] shrink-0', msg.senderId === 'dinu' ? 'text-sky-400' : 'text-rose-400')}>
                          {msg.senderName}:
                        </span>
                        <span className="text-slate-200 text-[11px] truncate flex-1">
                          {msg.text || (msg.gifUrl ? '🎬 Sent a GIF' : '')}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* TV Remote Quick Reaction Bar */}
                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">React:</span>
                  <div className="flex items-center gap-1.5">
                    {['❤️', '😂', '🔥', '🍿', '👏'].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleSendMessage(emoji)}
                        className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.16] border border-white/[0.12] text-sm flex items-center justify-center transition-transform hover:scale-110 cinema-focus focus:ring-2 focus:ring-sky-400"
                        title={`Send ${emoji}`}
                        aria-label={`Send ${emoji} reaction`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* Mobile Bottom Sheet vs Desktop Drawer */
              <motion.div
                initial={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
                animate={{ x: 0, y: 0 }}
                exit={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className={cn(
                  'fixed z-50 flex flex-col bg-[#080d17]/98 backdrop-blur-2xl',
                  isMobile
                    ? 'inset-x-0 bottom-0 h-[75vh] rounded-t-3xl border-t border-white/[0.15] shadow-[0_-16px_48px_rgba(0,0,0,0.9)] pb-safe'
                    : 'right-0 top-0 bottom-0 w-96 border-l border-white/[0.12] shadow-[-16px_0_48px_rgba(0,0,0,0.9)]'
                )}
                id={isMobile ? 'group-chat-bottom-sheet' : 'group-chat-drawer'}
              >
                {/* Mobile Drag Handle */}
                {isMobile && (
                  <div className="w-12 h-1.5 rounded-full bg-white/25 mx-auto mt-2.5 mb-1 shrink-0" />
                )}

                {/* Header */}
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#070b13]/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center text-sm">
                      🍿
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white tracking-tight">
                          {groupName}
                        </h3>
                        <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                          <Lock className="w-2.5 h-2.5 text-sky-400" />
                          Private
                        </span>
                        {isTVMode && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                            TV
                          </span>
                        )}
                      </div>

                      {/* Online Presence */}
                      <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              presence.dinu === 'Online'
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                                : 'bg-slate-600'
                            }`}
                          />
                          Dinu
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              presence.kanmani === 'Online'
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                                : 'bg-slate-600'
                            }`}
                          />
                          Kanmani
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {isTVMode && forceFullChat && (
                      <button
                        onClick={() => setForceFullChat(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cinema-focus"
                        title="Switch to TV Compact Mode"
                      >
                        <Minimize2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cinema-focus"
                      title="Close chat"
                      id="btn-close-group-chat"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                      <Sparkles className="w-8 h-8 text-slate-600 animate-pulse" />
                      <p className="text-xs font-medium text-slate-400">
                        Private chat between Dinu & Kanmani
                      </p>
                      <p className="text-[11px] text-slate-600 max-w-xs">
                        Send a message or react with emojis and GIFs during synchronized screening.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        currentUserId={profile.id}
                        onReply={(targetMsg) => {
                          setReplyTo({
                            id: targetMsg.id,
                            senderId: targetMsg.senderId,
                            senderName: targetMsg.senderName,
                            text: targetMsg.text || 'GIF',
                          });
                        }}
                        onToggleReaction={handleToggleReaction}
                      />
                    ))
                  )}

                  {/* Live Typing Indicator */}
                  <TypingIndicator
                    isTyping={isOtherUserTyping}
                    name={otherUserName}
                  />

                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input */}
                <ChatInput
                  onSendMessage={handleSendMessage}
                  replyTo={replyTo}
                  onCancelReply={() => setReplyTo(null)}
                  onTyping={handleTyping}
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
