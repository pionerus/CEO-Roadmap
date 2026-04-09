'use client';

import { useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useProjectTasks, useUpdateTask } from '@/lib/hooks/useTasks';
import { useUIStore } from '@/lib/stores/uiStore';
import { PriorityIcon } from '@/components/shared/PriorityIcon';
import type { Status, TaskWithRelations } from '@/lib/types';

interface ProjectKanbanProps {
  projectId: string;
}

export function ProjectKanban({ projectId }: ProjectKanbanProps) {
  const supabase = createClient();
  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(projectId);
  const updateTask = useUpdateTask();
  const openTaskDetail = useUIStore((s) => s.openTaskDetail);
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('statuses').select('*').order('order');
      return (data ?? []) as Status[];
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const targetStatusId = over.id as string;

      // Check if dropped on a status column
      const isStatusColumn = statuses.some((s) => s.id === targetStatusId);
      if (isStatusColumn) {
        const task = tasks.find((t) => t.id === taskId);
        if (task && task.status_id !== targetStatusId) {
          updateTask.mutate({ id: taskId, status_id: targetStatusId });
        }
      }
    },
    [statuses, tasks, updateTask]
  );

  if (tasksLoading || statusesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {statuses.map((status) => {
          const columnTasks = tasks.filter((t) => t.status_id === status.id);
          return (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={columnTasks}
              onTaskClick={openTaskDetail}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask && <KanbanCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  onTaskClick,
}: {
  status: Status;
  tasks: TaskWithRelations[];
  onTaskClick: (id: string) => void;
}) {
  return (
    <div className="flex w-64 flex-shrink-0 flex-col rounded-lg bg-bg-secondary">
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <div
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: status.color }}
        />
        <span className="text-xs font-medium text-text-primary">
          {status.name}
        </span>
        <span className="ml-auto text-xs text-text-muted">{tasks.length}</span>
      </div>

      {/* Droppable area */}
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
        id={status.id}
      >
        <div
          className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[100px]"
          data-status-id={status.id}
          id={status.id}
        >
          {tasks.map((task) => (
            <KanbanCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function KanbanCard({
  task,
  isDragging,
  onClick,
}: {
  task: TaskWithRelations;
  isDragging?: boolean;
  onClick?: () => void;
}) {
  const subtasksDone = task.subtasks?.filter((s) => s.done).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;

  return (
    <div
      onClick={onClick}
      className={`rounded-lg border border-border bg-bg-primary p-2.5 cursor-pointer transition-all ${
        isDragging
          ? 'shadow-xl opacity-90 rotate-2'
          : 'hover:border-border-hover'
      }`}
      id={task.id}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <PriorityIcon priority={task.priority} />
        <span className="text-[10px] font-mono text-text-muted">
          {task.identifier}
        </span>
      </div>
      <p className="text-xs text-text-primary leading-relaxed">{task.title}</p>
      <div className="flex items-center gap-2 mt-2">
        {subtasksTotal > 0 && (
          <span className="text-[10px] text-text-muted">
            {subtasksDone}/{subtasksTotal}
          </span>
        )}
        {task.effort && (
          <span className="rounded bg-bg-tertiary px-1 py-0.5 text-[10px] text-text-muted">
            {task.effort}
          </span>
        )}
        {task.assignee && (
          <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-accent/20 text-[10px] font-medium text-accent">
            {task.assignee.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
