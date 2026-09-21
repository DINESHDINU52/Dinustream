'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Info, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'info' | 'success' | 'sync';

export interface ToastProps {
  id?: string;
  message: string;
  subtext?: string;
  type?: ToastType;
  isVisible: boolean;
  onDismiss?: () => void;
  className?: string;
}

const typeIcons: Record<ToastType, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-slate-300" />,
  success: <Check className="w-4 h-4 text-emerald-400" />,
  sync: <Users className="w-4 h-4 text-sky-400" />,
};

export const Toast: React.FC<ToastProps> = ({
  message,
  subtext,
  type = 'info',
  isVisible,
  onDismiss,
  className,
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          /*
            `role="status"` + `aria-live` so screen readers announce the
            confirmation; the toast is the only feedback for watchlist changes.
          */
          role="status"
          aria-live="polite"
          className={cn(
            'fixed z-50 flex items-start gap-3 p-3.5 sm:p-4 rounded-xl',
            /*
              Positioning: on phones the toast spans the gutters and sits above
              the fixed bottom navigation. At `bottom-6 right-6` it was rendered
              directly underneath that 56px bar plus the home-indicator inset,
              so watchlist confirmations were invisible on mobile — the exact
              devices that rely on them most.
            */
            'inset-x-4 bottom-[calc(var(--cinema-mobile-nav-height)+env(safe-area-inset-bottom,0px)+12px)]',
            'lg:inset-x-auto lg:right-6 lg:bottom-6 lg:max-w-md',
            'glass-strong glass-sheen',
            'select-none',
            className
          )}
        >
          <span className="shrink-0 mt-0.5 p-1 rounded bg-white/[0.06]">{typeIcons[type]}</span>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-xs sm:text-sm font-medium text-white break-words">{message}</p>
            {subtext && <p className="text-[11px] text-slate-400 break-words">{subtext}</p>}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="shrink-0 -m-1 p-1 text-slate-400 hover:text-white rounded transition-colors touch-target flex items-center justify-center"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
