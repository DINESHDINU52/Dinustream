'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import Image from 'next/image';

interface GifPickerProps {
  onSelectGif: (gifUrl: string) => void;
  onClose?: () => void;
}

interface CinemaGif {
  id: string;
  title: string;
  url: string;
  category: 'popcorn' | 'mindblown' | 'cheer' | 'hype';
}

const CURATED_GIFS: CinemaGif[] = [
  {
    id: 'popcorn-1',
    title: 'Popcorn Munching',
    url: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400&auto=format&fit=crop&q=80',
    category: 'popcorn',
  },
  {
    id: 'cinema-2',
    title: 'Neon Noir Vibe',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80',
    category: 'hype',
  },
  {
    id: 'cheer-3',
    title: 'Cinema Applause',
    url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&auto=format&fit=crop&q=80',
    category: 'cheer',
  },
  {
    id: 'cosmic-4',
    title: 'Interstellar Mind Blown',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=80',
    category: 'mindblown',
  },
  {
    id: 'retro-5',
    title: '3D Glasses Classic',
    url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=400&auto=format&fit=crop&q=80',
    category: 'popcorn',
  },
  {
    id: 'film-6',
    title: 'Film Projector Beam',
    url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&auto=format&fit=crop&q=80',
    category: 'hype',
  },
];

export function GifPicker({ onSelectGif, onClose }: GifPickerProps) {
  const [search, setSearch] = useState('');

  const filtered = CURATED_GIFS.filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase()) ||
    g.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 10 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="p-3.5 rounded-2xl bg-[#0d1424]/95 backdrop-blur-xl border border-white/[0.12] shadow-[0_16px_40px_rgba(0,0,0,0.85)] w-72 z-50 space-y-3"
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.08]">
        <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
          Cinema GIFs & Reactions
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reaction GIFs..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#070b13] border border-white/[0.08] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-0.5 custom-scrollbar">
        {filtered.map((gif) => (
          <button
            key={gif.id}
            type="button"
            onClick={() => onSelectGif(gif.url)}
            className="group relative rounded-lg overflow-hidden border border-white/[0.08] hover:border-sky-400/50 transition-all aspect-video"
          >
            <Image
              src={gif.url}
              alt={gif.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] text-white font-medium truncate">
                {gif.title}
              </span>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
