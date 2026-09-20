/**
 * DinuStream — "Your Private Cinema" Design System
 * 
 * Aesthetic Principles:
 * - Near-black cinematic background (#06080d)
 * - Midnight blue undertones (#162032)
 * - Subtle silver & platinum accents (#cbd5e1, #94a3b8)
 * - Crisp premium white typography (#ffffff, #f8fafc)
 * - Restrained gradients, soft shadows & subtle glassmorphism
 * - Refined radii & premium breathing room
 */

export const CINEMA_TOKENS = {
  colors: {
    bg: {
      cinema: '#06080d',
      surface: '#0c111a',
      elevated: '#111724',
      highlight: '#172133',
    },
    midnight: {
      base: '#162032',
      hover: '#1e2c45',
      subtle: 'rgba(22, 32, 50, 0.6)',
      border: 'rgba(30, 48, 77, 0.45)',
    },
    silver: {
      light: '#f8fafc',
      base: '#cbd5e1',
      muted: '#94a3b8',
      subtle: '#64748b',
      border: 'rgba(203, 213, 225, 0.12)',
      borderHover: 'rgba(203, 213, 225, 0.25)',
      borderActive: 'rgba(203, 213, 225, 0.4)',
    },
    accent: {
      dinu: '#38bdf8',
      dinuMuted: 'rgba(56, 189, 248, 0.15)',
      kanmani: '#f43f5e',
      kanmaniMuted: 'rgba(244, 63, 94, 0.15)',
      emerald: '#10b981',
    },
  },

  typography: {
    display: 'font-semibold tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white leading-tight',
    h1: 'font-semibold tracking-tight text-2xl sm:text-3xl md:text-4xl text-white',
    h2: 'font-medium tracking-tight text-xl sm:text-2xl md:text-3xl text-slate-100',
    h3: 'font-medium tracking-normal text-lg sm:text-xl text-slate-200',
    title: 'font-medium text-base sm:text-lg text-slate-100',
    kicker: 'text-xs font-semibold tracking-widest uppercase text-slate-400',
    bodyLarge: 'text-base sm:text-lg leading-relaxed text-slate-300 font-light',
    body: 'text-sm sm:text-base leading-relaxed text-slate-300',
    caption: 'text-xs leading-normal text-slate-400',
    metadata: 'text-xs font-medium tracking-wide text-slate-400 font-mono',
  },

  spacing: {
    sectionGap: 'gap-10 sm:gap-14 md:gap-20',
    container: 'max-w-7xl mx-auto px-4 sm:px-8 lg:px-12',
    gridMedia: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-5',
    gridCards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
  },

  radius: {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  },

  shadows: {
    soft: 'shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
    card: 'shadow-[0_8px_30px_rgba(0,0,0,0.65)]',
    elevated: 'shadow-[0_16px_48px_rgba(0,0,0,0.85)]',
    insetHairline: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
  },

  glass: {
    panel: 'bg-[#0b101a]/75 backdrop-blur-md border border-slate-400/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
    card: 'bg-[#0d1320]/60 backdrop-blur-sm border border-slate-300/[0.08] hover:border-slate-300/[0.2] transition-colors',
    navbar: 'bg-[#06080d]/85 backdrop-blur-xl border-b border-slate-400/[0.08]',
    modal: 'bg-[#0a0f18]/95 backdrop-blur-xl border border-slate-400/[0.15] shadow-[0_24px_64px_rgba(0,0,0,0.9)]',
    drawer: 'bg-[#080d15]/95 backdrop-blur-xl border-l border-slate-400/[0.12] shadow-2xl',
  },

  overlays: {
    vignette: 'radial-gradient(ellipse at center, transparent 45%, rgba(6,8,13,0.85) 100%)',
    heroFade: 'linear-gradient(to top, #06080d 0%, rgba(6,8,13,0.9) 25%, rgba(6,8,13,0.4) 65%, transparent 100%)',
    heroLeftGradient: 'linear-gradient(to right, #06080d 0%, rgba(6,8,13,0.85) 35%, rgba(6,8,13,0.2) 70%, transparent 100%)',
    cardFade: 'linear-gradient(to top, rgba(6,8,13,0.95) 0%, rgba(6,8,13,0.4) 50%, transparent 100%)',
  },
} as const;

export const DESIGN_TOKENS = CINEMA_TOKENS;
