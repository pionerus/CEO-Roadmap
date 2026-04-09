'use client';

import { useCallback, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const overId = over.id as string;

      // Determine target status: either a column ID or a task in a column
      let targetStatusId: string | null = null;
      if (statuses.some((s) => s.id === overId)) {
        targetStatusId = overId;
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) targetStatusId = overTask.status_id;
      }

      if (!targetStatusId) return;

      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status_id !== targetStatusId) {
        updateTask.mutate({ id: taskId, status_id: targetStatusId });
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

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="w-60 rounded-lg border border-accent bg-bg-primary p-2.5 shadow-xl rotate-2">
            <CardContent task={activeTask} />
          </div>
        )}
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
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <div className="flex w-64 flex-shrink-0 flex-col rounded-lg bg-bg-secondary">
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

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[100px] transition-colors ${
          isOver ? 'bg-accent/5 ring-1 ring-inset ring-accent/20' : ''
        }`}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-text-muted">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

function SortableCard({
  task,
  onClick,
}: {
  task: TaskWithRelations;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging) onClick();
      }}
      className={`rounded-lg border border-border bg-bg-primary p-2.5 cursor-grab active:cursor-grabbing transition-colors ${
        isDragging ? 'opacity-30' : 'hover:border-border-hover'
      }`}
    >
      <CardContent task={task} />
    </div>
  );
}

function CardContent({ task }: { task: TaskWithRelations }) {
  const subtasksDone = task.subtasks?.filter((s) => s.done).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;

  return (
    <>
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
    </>
  );
}
