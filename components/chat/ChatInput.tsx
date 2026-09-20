'use client';

import React, { useState, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ChatReplyTo } from '@/types/chat';
import { EmojiPicker } from './EmojiPicker';
import { GifPicker } from './GifPicker';
import { Send, Smile, Image as ImageIcon, X, Reply } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, gifUrl?: string) => void;
  replyTo?: ChatReplyTo | null;
  onCancelReply: () => void;
  onTyping: (isTyping: boolean) => void;
}

export function ChatInput({
  onSendMessage,
  replyTo,
  onCancelReply,
  onTyping,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    onTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2500);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    onSendMessage(text.trim());
    setText('');
    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
  };

  const handleSelectEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSelectGif = (gifUrl: string) => {
    onSendMessage('', gifUrl);
    setShowGifPicker(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative border-t border-white/[0.08] bg-[#070b13]/90 backdrop-blur-md p-3 space-y-2">
      {/* Active Reply Banner */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/[0.05] border-l-2 border-sky-400 text-xs text-slate-300">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span className="font-medium text-sky-300">
              Replying to {replyTo.senderName}:
            </span>
            <span className="text-slate-400 truncate">{replyTo.text}</span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-slate-500 hover:text-white transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Popovers */}
      <AnimatePresence>
        {showEmojiPicker && (
          <div className="absolute bottom-full mb-2 left-3 z-50">
            <EmojiPicker
              onSelectEmoji={handleSelectEmoji}
              onClose={() => setShowEmojiPicker(false)}
            />
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGifPicker && (
          <div className="absolute bottom-full mb-2 left-10 z-50">
            <GifPicker
              onSelectGif={handleSelectGif}
              onClose={() => setShowGifPicker(false)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Input Row */}
      <form onSubmit={handleSend} className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker((prev) => !prev);
              setShowGifPicker(false);
            }}
            className="p-1.5 rounded-lg hover:text-sky-300 hover:bg-white/[0.08] transition-colors"
            title="Add emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowGifPicker((prev) => !prev);
              setShowEmojiPicker(false);
            }}
            className="p-1.5 rounded-lg hover:text-sky-300 hover:bg-white/[0.08] transition-colors"
            title="Choose GIF"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Send private message to room..."
          className="flex-1 px-3.5 py-2 rounded-xl bg-[#0e1626] border border-white/[0.08] text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-light"
        />

        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:hover:bg-sky-500 text-white shadow-md shadow-sky-500/20 transition-all"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
