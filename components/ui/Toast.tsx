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
          className={cn(
            'fixed bottom-6 right-6 z-50 flex items-start gap-3 p-3.5 sm:p-4 rounded-lg',
            'bg-[#0c121e]/95 backdrop-blur-xl border border-slate-400/[0.18] shadow-[0_16px_40px_rgba(0,0,0,0.85)]',
            'max-w-md select-none',
            className
          )}
        >
          <div className="shrink-0 mt-0.5 p-1 rounded bg-white/[0.06]">
            {typeIcons[type]}
          </div>

          <div className="flex-1 space-y-0.5 pr-2">
            <p className="text-xs sm:text-sm font-medium text-white">{message}</p>
            {subtext && <p className="text-[11px] text-slate-400">{subtext}</p>}
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="shrink-0 p-1 text-slate-400 hover:text-white rounded transition-colors"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
