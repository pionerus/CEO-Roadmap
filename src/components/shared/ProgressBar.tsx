'use client';

import type { Progress } from '@/lib/types';

interface ProgressBarProps {
  progress: Progress;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({
  progress,
  showLabel = true,
  size = 'sm',
}: ProgressBarProps) {
  const height = size === 'sm' ? 'h-1' : 'h-1.5';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex-1 rounded-full bg-bg-tertiary overflow-hidden ${height}`}
      >
        <div
          className={`${height} rounded-full transition-all duration-300 ${
            progress.percentage === 100 ? 'bg-success' : 'bg-accent'
          }`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text-muted tabular-nums whitespace-nowrap">
          {progress.done}/{progress.total}
        </span>
      )}
    </div>
  );
}
