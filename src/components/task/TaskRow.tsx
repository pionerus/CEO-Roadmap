'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { PriorityIcon } from '@/components/shared/PriorityIcon';
import { useUpdateTask } from '@/lib/hooks/useTasks';
import { useUIStore } from '@/lib/stores/uiStore';
import type { TaskWithRelations, Status } from '@/lib/types';

interface TaskRowProps {
  task: TaskWithRelations;
  allTasks?: TaskWithRelations[]; // pass all project tasks to resolve blocker status
}

export function TaskRow({ task, allTasks }: TaskRowProps) {
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
  const isDone = currentStatus?.is_done ?? false;

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

  // Dependencies — check both directions
  const deps = task.task_dependencies ?? [];

  // Tasks that block THIS task (this task is blocked)
  const blockerTaskIds = new Set<string>();
  for (const d of deps) {
    if (d.type === 'blocked_by' && d.source_task_id === task.id) blockerTaskIds.add(d.target_task_id);
    if (d.type === 'blocks' && d.target_task_id === task.id) blockerTaskIds.add(d.source_task_id);
  }

  // Tasks that THIS task blocks
  const blockedTaskIds = new Set<string>();
  for (const d of deps) {
    if (d.type === 'blocks' && d.source_task_id === task.id) blockedTaskIds.add(d.target_task_id);
    if (d.type === 'blocked_by' && d.target_task_id === task.id) blockedTaskIds.add(d.source_task_id);
  }

  // Count active blockers (blockers that are NOT done)
  let activeBlockerCount = blockerTaskIds.size;
  if (allTasks && blockerTaskIds.size > 0) {
    activeBlockerCount = [...blockerTaskIds].filter((id) => {
      const t = allTasks.find((t) => t.id === id);
      if (!t) return true;
      const s = statuses.find((s) => s.id === t.status_id);
      return !s?.is_done;
    }).length;
  }
  const isBlocked = activeBlockerCount > 0 && !isDone;

  // Count active blocks (tasks we block that are NOT done)
  let activeBlocksCount = blockedTaskIds.size;
  if (allTasks && blockedTaskIds.size > 0) {
    activeBlocksCount = [...blockedTaskIds].filter((id) => {
      const t = allTasks.find((t) => t.id === id);
      if (!t) return true;
      const s = statuses.find((s) => s.id === t.status_id);
      return !s?.is_done;
    }).length;
  }

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
          isDone
            ? 'text-text-muted line-through'
            : isBlocked
              ? 'text-text-tertiary'
              : 'text-text-primary'
        }`}
      >
        {task.title}
      </span>

      {/* Blocked tag with count */}
      {isBlocked && (
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-danger/10 text-danger tabular-nums">
          blocked{activeBlockerCount > 1 ? ` by ${activeBlockerCount}` : ''}
        </span>
      )}

      {/* Blocks tag with count — only show if actively blocking undone tasks */}
      {activeBlocksCount > 0 && !isDone && (
        <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-warning/10 text-warning tabular-nums">
          blocks {activeBlocksCount}
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
