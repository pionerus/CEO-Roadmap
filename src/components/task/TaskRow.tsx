'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { PriorityIcon } from '@/components/shared/PriorityIcon';
import { useUpdateTask } from '@/lib/hooks/useTasks';
import { useUIStore } from '@/lib/stores/uiStore';
import type { TaskWithRelations, Status } from '@/lib/types';

interface TaskRowProps {
  task: TaskWithRelations;
}

export function TaskRow({ task }: TaskRowProps) {
  const openTaskDetail = useUIStore((s) => s.openTaskDetail);
  const updateTask = useUpdateTask();
  const supabase = createClient();

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('statuses')
        .select('*')
        .order('order');
      return (data ?? []) as Status[];
    },
  });

  const currentStatus = task.status ?? statuses.find((s) => s.id === task.status_id);

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!statuses.length || !currentStatus) return;
    const currentIdx = statuses.findIndex((s) => s.id === currentStatus.id);
    const nextIdx = (currentIdx + 1) % statuses.length;
    updateTask.mutate({ id: task.id, status_id: statuses[nextIdx].id });
  };

  const subtasksDone = task.subtasks?.filter((s) => s.done).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;
  const hasSubtasks = subtasksTotal > 0;

  const blockedBy = task.dependencies?.filter((d) => d.type === 'blocked_by' && d.source_task_id === task.id) ?? [];
  const blocks = task.dependencies?.filter((d) => d.type === 'blocks' && d.source_task_id === task.id) ?? [];
  const isBlocked = blockedBy.length > 0;

  return (
    <div
      onClick={() => openTaskDetail(task.id)}
      className="group flex items-center gap-3 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-bg-tertiary transition-colors"
    >
      {/* Priority */}
      <PriorityIcon priority={task.priority} />

      {/* Identifier */}
      <span className="text-xs font-mono text-text-muted w-24 flex-shrink-0">
        {task.identifier}
      </span>

      {/* Status dot */}
      {currentStatus && (
        <button
          onClick={cycleStatus}
          className="h-2.5 w-2.5 rounded-full flex-shrink-0 transition-transform hover:scale-125"
          style={{ backgroundColor: currentStatus.color }}
          title={`${currentStatus.name} (click to cycle)`}
        />
      )}

      {/* Title */}
      <span
        className={`flex-1 text-sm truncate ${
          isBlocked ? 'text-text-tertiary' : 'text-text-primary'
        }`}
      >
        {task.title}
      </span>

      {/* Blocked tag */}
      {isBlocked && (
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-danger/10 text-danger">
          blocked
        </span>
      )}

      {/* Blocks tag */}
      {blocks.length > 0 && (
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-warning/10 text-warning">
          blocks {blocks.length}
        </span>
      )}

      {/* Subtask progress */}
      {hasSubtasks && (
        <span className="text-xs text-text-muted tabular-nums">
          {subtasksDone}/{subtasksTotal}
        </span>
      )}

      {/* Effort badge */}
      {task.effort && (
        <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
          {task.effort}
        </span>
      )}

      {/* Labels */}
      {task.labels?.map((label) => (
        <span
          key={label.id}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `${label.color}20`,
            color: label.color,
          }}
        >
          {label.name}
        </span>
      ))}

      {/* Assignee */}
      {task.assignee && (
        <div
          className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[10px] font-medium text-accent flex-shrink-0"
          title={task.assignee.name}
        >
          {task.assignee.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
