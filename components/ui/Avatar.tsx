'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { UserProfile } from '@/types/cinema';

export interface AvatarProps {
  profile?: UserProfile;
  name?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

const sizeStyles = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl font-semibold',
};

export const Avatar: React.FC<AvatarProps> = ({
  profile,
  name,
  avatarUrl,
  size = 'md',
  isOnline,
  className,
}) => {
  const displayName = profile?.name || name || 'User';
  const initial = displayName[0]?.toUpperCase() || 'U';
  const resolvedOnline = profile ? profile.isOnline : isOnline;
  const isDinu = profile?.id === 'dinu' || displayName.toLowerCase().includes('dinu');

  const bgGradient = isDinu
    ? 'from-[#0e213d] to-[#121927] text-sky-200 border-sky-500/30'
    : 'from-[#33111f] to-[#1c0e18] text-rose-200 border-rose-500/30';

  return (
    <div className="relative inline-block select-none">
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-medium border shadow-sm bg-gradient-to-br',
          sizeStyles[size],
          bgGradient,
          className
        )}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {resolvedOnline && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-emerald-400 ring-2 ring-[#06080d]',
            size === 'sm' && 'w-2 h-2',
            size === 'md' && 'w-2.5 h-2.5',
            size === 'lg' && 'w-3 h-3',
            size === 'xl' && 'w-3.5 h-3.5'
          )}
        />
      )}
    </div>
  );
};
