'use client';

import { useState, useEffect } from 'react';
import { getGoogleAvatarColor, getAvatarInitial } from '@/lib/utils/avatar';

const SIZE_MAP = {
  xs: {
    dimensions: 'w-5 h-5',
    text: 'text-[10px]',
  },
  sm: {
    dimensions: 'w-7 h-7',
    text: 'text-xs',
  },
  base: {
    dimensions: 'w-8 h-8',
    text: 'text-xs',
  },
  md: {
    dimensions: 'w-9 h-9',
    text: 'text-xs font-bold',
  },
  'md-10': {
    dimensions: 'w-10 h-10',
    text: 'text-sm font-bold',
  },
  md10: {
    dimensions: 'w-10 h-10',
    text: 'text-sm font-bold',
  },
  lg: {
    dimensions: 'w-12 h-12',
    text: 'text-base font-bold',
  },
  xl: {
    dimensions: 'w-20 h-20 sm:w-22 sm:h-22',
    text: 'text-2xl sm:text-3xl font-black',
  },
};

const ROUNDED_MAP = {
  full: 'rounded-full',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
};

export default function UserAvatar({
  src = null,
  name = '',
  email = '',
  size = 'base',
  rounded = 'full',
  className = '',
  alt = '',
  showRing = false,
}) {
  const [imageError, setImageError] = useState(false);

  // Reset error state whenever src changes
  useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.base;
  const roundedClass = ROUNDED_MAP[rounded] || 'rounded-full';
  const color = getGoogleAvatarColor(name || email);
  const initial = getAvatarInitial(name, email);

  const ringClass = showRing ? 'ring-1 ring-emerald-500/40' : '';

  if (src && !imageError) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden ${sizeConfig.dimensions} ${roundedClass} ${ringClass} ${className}`}
      >
        <img
          src={src}
          alt={alt || name || 'User profile'}
          className={`object-cover w-full h-full ${roundedClass}`}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 flex items-center justify-center font-bold select-none ${sizeConfig.dimensions} ${sizeConfig.text} ${roundedClass} ${color.bg} ${color.text} ${ringClass} ${className}`}
      title={name || email || 'User'}
    >
      <span>{initial}</span>
    </div>
  );
}
