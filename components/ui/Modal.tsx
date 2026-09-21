'use client';

import React, { useEffect, useCallback, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  kicker?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeStyles = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

/**
 * Modal — centred dialog on tablet/desktop, bottom sheet on phones.
 *
 * Layout notes
 *  - The scroll container is the full-screen wrapper and the panel sits inside
 *    a `min-h-full` flex row. The previous structure applied `items-center`
 *    directly to the scrolling element, which is the classic flexbox trap: once
 *    content is taller than the viewport the overflow is distributed to *both*
 *    sides and the top of the panel becomes unreachable. The details modal hit
 *    this on any phone in landscape.
 *  - The panel itself is a column with a `max-h` and a scrolling body, so the
 *    header and footer stay pinned and only the content moves.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  kicker,
  description,
  children,
  footer,
  size = 'md',
  className,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    /*
      Restore the previous inline value instead of blanking it. Hard-coding
      `overflow = ''` on cleanup meant that closing a modal opened from inside
      the fullscreen player (which also locks body scroll) handed scrolling back
      to the page underneath the video.
    */
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain">
          {/* Dim backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-[#04070f]/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Centring row — `min-h-full` keeps tall panels fully scrollable */}
          <div className="relative flex min-h-full items-end justify-center p-0 sm:items-center sm:p-6">
            <motion.div
              ref={panelRef}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              className={cn(
                // Bottom sheet on phones, floating card from `sm` up.
                'w-full flex flex-col outline-none',
                'max-h-[92dvh] sm:max-h-[86dvh]',
                'glass-strong glass-sheen',
                // Bottom sheet meets the screen edge on phones, so only the top
                // rim is drawn; from `sm` up it is a floating card with all four.
                'glass-sheet-bottom sm:border',
                'rounded-t-2xl sm:rounded-xl overflow-hidden pb-safe-flush sm:pb-0',
                sizeStyles[size],
                className
              )}
            >
              {/* Grab handle — signals the sheet is dismissible on touch */}
              <span
                aria-hidden="true"
                className="sm:hidden mx-auto mt-2.5 mb-0.5 h-1 w-10 shrink-0 rounded-full bg-white/20"
              />

              {/* Header */}
              {(title || kicker || description) && (
                <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-white/[0.06] shrink-0">
                  <div className="space-y-1 min-w-0">
                    {kicker && (
                      <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {kicker}
                      </p>
                    )}
                    {title && (
                      <h3
                        id={titleId}
                        className="text-base sm:text-xl font-semibold text-white tracking-tight break-words"
                      >
                        {title}
                      </h3>
                    )}
                    {description && (
                      <p className="text-xs sm:text-sm text-slate-400 font-light mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    label="Close modal"
                    className="shrink-0 touch-target"
                    icon={<X className="w-4 h-4 text-slate-400 hover:text-white" />}
                    onClick={onClose}
                  />
                </div>
              )}

              {/* Scrolling content body */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 text-sm text-slate-300">
                {children}
              </div>

              {/* Optional footer */}
              {footer && (
                <div className="flex flex-wrap items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-white/[0.06] bg-[#070b12]/60 shrink-0">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
