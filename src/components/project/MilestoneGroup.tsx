'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { TaskRow } from '@/components/task/TaskRow';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { calculateProgress } from '@/lib/utils/progress';
import type { ProjectMilestoneWithTasks, Status } from '@/lib/types';

interface MilestoneGroupProps {
  milestone: ProjectMilestoneWithTasks;
  statuses: Status[];
}

export function MilestoneGroup({ milestone, statuses }: MilestoneGroupProps) {
  const [expanded, setExpanded] = useState(true);

  const done = milestone.tasks.filter((t) => {
    const status = statuses.find((s) => s.id === t.status_id);
    return status?.is_done;
  }).length;
  const progress = calculateProgress(done, milestone.tasks.length);

  return (
    <div className="mb-4">
      {/* Milestone header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-bg-tertiary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
        )}
        <span className="text-sm font-medium text-text-primary">
          {milestone.title}
        </span>
        {milestone.global_milestone_id && (
          <span title="Linked to global milestone">
            <Link2 className="h-3 w-3 text-accent" />
          </span>
        )}
        <div className="flex-1 max-w-[120px]">
          <ProgressBar progress={progress} size="sm" />
        </div>
      </button>

      {/* Tasks */}
      {expanded && (
        <div className="ml-2 border-l border-border pl-2">
          {milestone.tasks.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-muted">
              No tasks in this milestone
            </p>
          ) : (
            milestone.tasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
