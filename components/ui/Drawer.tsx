'use client';

import React, { useEffect, useCallback } from 'react';
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
    panelClass: 'right-0 inset-y-0 border-l',
  },
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    panelClass: 'left-0 inset-y-0 border-r',
  },
  bottom: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    panelClass: 'bottom-0 inset-x-0 border-t rounded-t-xl',
  },
};

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
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
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
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
            className="fixed inset-0 bg-[#06080d]/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={pos.initial}
            animate={pos.animate}
            exit={pos.exit}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'fixed z-50 bg-[#090e17]/95 border-slate-400/[0.12] shadow-2xl flex flex-col',
              pos.panelClass,
              position !== 'bottom' && 'w-full',
              position !== 'bottom' && sizeStyles[size],
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <div>
                {kicker && (
                  <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {kicker}
                  </p>
                )}
                {title && (
                  <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                    {title}
                  </h3>
                )}
              </div>
              <IconButton
                variant="ghost"
                size="sm"
                label="Close drawer"
                icon={<X className="w-4 h-4 text-slate-400 hover:text-white" />}
                onClick={onClose}
              />
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 text-sm text-slate-300">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
