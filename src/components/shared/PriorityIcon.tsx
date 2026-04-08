'use client';

import {
  AlertTriangle,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  Minus,
} from 'lucide-react';
import type { Priority } from '@/lib/types';

const priorityConfig: Record<
  Priority,
  { icon: React.ComponentType<{ className?: string }>; color: string; label: string }
> = {
  urgent: { icon: AlertTriangle, color: 'text-danger', label: 'Urgent' },
  high: { icon: ArrowUp, color: 'text-warning', label: 'High' },
  medium: { icon: ArrowRight, color: 'text-accent', label: 'Medium' },
  low: { icon: ArrowDown, color: 'text-text-muted', label: 'Low' },
  none: { icon: Minus, color: 'text-text-muted', label: 'None' },
};

interface PriorityIconProps {
  priority: Priority;
  showLabel?: boolean;
}

export function PriorityIcon({ priority, showLabel }: PriorityIconProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {showLabel && <span className="text-xs">{config.label}</span>}
    </span>
  );
}
