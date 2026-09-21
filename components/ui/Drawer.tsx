'use client';

import React, { useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { cn } from '@/lib/utils';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  kicker?: string;
  children: React.ReactNode;
  position?: 'right' | 'left' | 'bottom';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const positionVariants = {
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    // Side sheets take the full width on phones and cap out from `sm` up.
    panelClass: 'right-0 inset-y-0 border-l w-full pt-safe-flush pb-safe-flush',
  },
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    panelClass: 'left-0 inset-y-0 border-r w-full pt-safe-flush pb-safe-flush',
  },
  bottom: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    /*
      `max-h` is essential here. Without it the sheet grew to its content height
      and ran straight off the top of the screen, stranding both the header and
      the close button outside the viewport.
    */
    panelClass: 'bottom-0 inset-x-0 glass-sheet-bottom rounded-t-2xl max-h-[85dvh] pb-safe-flush',
  },
};

const sizeStyles = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  kicker,
  children,
  position = 'right',
  size = 'md',
  className,
}) => {
  const titleId = useId();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    // Restore the previous value rather than clearing it — see Modal.tsx.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  const pos = positionVariants[position];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-[#04070f]/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={pos.initial}
            animate={pos.animate}
            exit={pos.exit}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            className={cn(
              'fixed z-50 glass-strong flex flex-col',
              pos.panelClass,
              position !== 'bottom' && sizeStyles[size],
              className
            )}
          >
            {position === 'bottom' && (
              <span
                aria-hidden="true"
                className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20"
              />
            )}

            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-white/[0.06] shrink-0">
              <div className="min-w-0">
                {kicker && (
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {kicker}
                  </p>
                )}
                {title && (
                  <h3
                    id={titleId}
                    className="text-base sm:text-lg font-semibold text-white tracking-tight break-words"
                  >
                    {title}
                  </h3>
                )}
              </div>
              <IconButton
                variant="ghost"
                size="sm"
                label="Close drawer"
                className="shrink-0 touch-target"
                icon={<X className="w-4 h-4 text-slate-400 hover:text-white" />}
                onClick={onClose}
              />
            </div>

            {/* Content body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 text-sm text-slate-300">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
