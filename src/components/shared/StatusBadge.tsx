'use client';

import type { Status } from '@/lib/types';

interface StatusBadgeProps {
  status: Status;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  onClick,
  size = 'sm',
}: StatusBadgeProps) {
  const sizeClass = size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <button
      onClick={onClick}
      className={`${sizeClass} rounded-full flex-shrink-0 transition-transform hover:scale-125`}
      style={{ backgroundColor: status.color }}
      title={status.name}
    />
  );
}
