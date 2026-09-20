'use client';

import React, { useEffect, useCallback } from 'react';
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
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Dim Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-[#06080d]/85 backdrop-blur-md -z-10"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            className={cn(
              'w-full bg-[#0a0f18]/95 border border-slate-400/[0.14] rounded-xl shadow-[0_24px_64px_rgba(0,0,0,0.95)] overflow-hidden',
              sizeStyles[size],
              className
            )}
          >
            {/* Header */}
            {(title || kicker || description) && (
              <div className="flex items-start justify-between p-5 sm:p-6 border-b border-white/[0.06]">
                <div className="space-y-1">
                  {kicker && (
                    <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {kicker}
                    </p>
                  )}
                  {title && (
                    <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
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
                  icon={<X className="w-4 h-4 text-slate-400 hover:text-white" />}
                  onClick={onClose}
                />
              </div>
            )}

            {/* Content Body */}
            <div className="p-5 sm:p-6 text-sm text-slate-300">{children}</div>

            {/* Optional Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-2.5 p-4 sm:p-5 border-t border-white/[0.06] bg-[#070b12]/60">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
