'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { DESIGN_TOKENS } from '@/lib/design-system';

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
}

export const CinemaDisplay: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'h1',
  ...props
}) => (
  <Tag className={cn(DESIGN_TOKENS.typography.display, 'text-zinc-100', className)} {...props}>
    {children}
  </Tag>
);

export const CinemaTitle: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'h2',
  ...props
}) => (
  <Tag className={cn(DESIGN_TOKENS.typography.h2, 'text-zinc-100', className)} {...props}>
    {children}
  </Tag>
);

export const CinemaSubtitle: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'h3',
  ...props
}) => (
  <Tag className={cn(DESIGN_TOKENS.typography.h3, 'text-zinc-200', className)} {...props}>
    {children}
  </Tag>
);

export const CinemaKicker: React.FC<TypographyProps> = ({
  children,
  className,
  as: Tag = 'span',
  ...props
}) => (
  <Tag className={cn(DESIGN_TOKENS.typography.kicker, className)} {...props}>
    {children}
  </Tag>
);

export const CinemaText: React.FC<TypographyProps & { variant?: 'body' | 'bodyLarge' | 'caption' | 'metadata' }> = ({
  children,
  className,
  as: Tag = 'p',
  variant = 'body',
  ...props
}) => (
  <Tag className={cn(DESIGN_TOKENS.typography[variant], className)} {...props}>
    {children}
  </Tag>
);
