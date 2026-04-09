'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { GripVertical, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { useProjectMilestones } from '@/lib/hooks/useMilestones';
import {
  useProjectTasks,
  useUpdateTask,
  useReorderTasks,
} from '@/lib/hooks/useTasks';
import { TaskRow } from '@/components/task/TaskRow';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { calculateProgress } from '@/lib/utils/progress';
import { useFilterStore } from '@/lib/stores/filterStore';
import type { Status, TaskWithRelations, ProjectMilestoneWithTasks } from '@/lib/types';

interface ProjectListProps {
  projectId: string;
}

const NO_MILESTONE = '__no_milestone__';

export function ProjectList({ projectId }: ProjectListProps) {
  const supabase = createClient();
  const { data: milestones = [], isLoading: milestonesLoading } =
    useProjectMilestones(projectId);
  const { data: allTasks = [], isLoading: tasksLoading } =
    useProjectTasks(projectId);
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const [expandedMs, setExpandedMs] = useState<Set<string>>(new Set(['__all__']));

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('statuses').select('*').order('order');
      return (data ?? []) as Status[];
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Filters
  const { hideDone, priorityFilter, assigneeFilter } = useFilterStore();

  const applyFilters = (tasks: TaskWithRelations[]): TaskWithRelations[] => {
    let filtered = tasks;
    if (hideDone) {
      filtered = filtered.filter((t) => {
        const st = statuses.find((s) => s.id === t.status_id);
        return !st?.is_done;
      });
    }
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }
    if (assigneeFilter !== 'all') {
      filtered = filtered.filter((t) => t.assignee_id === assigneeFilter);
    }
    return filtered;
  };

  // Build task groups by milestone
  const tasksByMilestone = new Map<string, TaskWithRelations[]>();
  for (const ms of milestones) {
    const msTasks = applyFilters(
      ((ms.tasks ?? []) as TaskWithRelations[]).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );
    tasksByMilestone.set(ms.id, msTasks);
  }
  const unassigned = applyFilters(
    allTasks
      .filter((t) => !t.project_milestone_id)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  tasksByMilestone.set(NO_MILESTONE, unassigned);

  const findGroupForTask = (taskId: string): string | null => {
    for (const [groupId, tasks] of tasksByMilestone) {
      if (tasks.some((t) => t.id === taskId)) return groupId;
    }
    return null;
  };

  const toggleExpand = (id: string) => {
    setExpandedMs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Start expanded
  const isExpanded = (id: string) =>
    expandedMs.has('__all__') || expandedMs.has(id);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = allTasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [allTasks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTask(null);
      const { active, over } = event;
      if (!over) return;

      const taskId = active.id as string;
      const overId = over.id as string;

      // Check if dropped on a milestone droppable zone
      const isMilestoneZone =
        overId === NO_MILESTONE || milestones.some((m) => m.id === overId);

      if (isMilestoneZone) {
        const newMilestoneId = overId === NO_MILESTONE ? null : overId;
        const task = allTasks.find((t) => t.id === taskId);
        if (task && (task.project_milestone_id ?? null) !== newMilestoneId) {
          updateTask.mutate({
            id: taskId,
            project_milestone_id: newMilestoneId,
          });
        }
        return;
      }

      // Dropped on another task — reorder or move between groups
      const sourceGroup = findGroupForTask(taskId);
      const targetGroup = findGroupForTask(overId);
      if (!sourceGroup || !targetGroup) return;

      if (sourceGroup === targetGroup) {
        // Reorder within group
        const groupTasks = tasksByMilestone.get(sourceGroup) ?? [];
        const oldIdx = groupTasks.findIndex((t) => t.id === taskId);
        const newIdx = groupTasks.findIndex((t) => t.id === overId);
        if (oldIdx === newIdx) return;
        const reordered = arrayMove(groupTasks, oldIdx, newIdx);
        reorderTasks.mutate({
          projectId,
          orderedIds: reordered.map((t) => t.id),
        });
      } else {
        // Move to different milestone
        const newMilestoneId =
          targetGroup === NO_MILESTONE ? null : targetGroup;
        updateTask.mutate({
          id: taskId,
          project_milestone_id: newMilestoneId,
        });
      }
    },
    [allTasks, milestones, tasksByMilestone, updateTask, reorderTasks, projectId, findGroupForTask]
  );

  if (milestonesLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="p-4">
        {milestones.map((ms) => (
          <MilestoneDropZone
            key={ms.id}
            milestone={ms}
            tasks={tasksByMilestone.get(ms.id) ?? []}
            statuses={statuses}
            expanded={isExpanded(ms.id)}
            onToggle={() => toggleExpand(ms.id)}
          />
        ))}

        {/* No Milestone zone */}
        {(unassigned.length > 0 || milestones.length > 0) && (
          <NoMilestoneDropZone
            tasks={unassigned}
            expanded={isExpanded(NO_MILESTONE)}
            onToggle={() => toggleExpand(NO_MILESTONE)}
          />
        )}

        {milestones.length === 0 && unassigned.length === 0 && (
          <div className="flex items-center justify-center py-12 text-sm text-text-muted">
            No milestones or tasks yet
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <div className="opacity-90 shadow-lg rounded-lg bg-bg-secondary border border-accent px-2 py-1">
            <TaskRow task={activeTask} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// Milestone as a droppable zone
function MilestoneDropZone({
  milestone,
  tasks,
  statuses,
  expanded,
  onToggle,
}: {
  milestone: ProjectMilestoneWithTasks;
  tasks: TaskWithRelations[];
  statuses: Status[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: milestone.id });

  const done = tasks.filter((t) => {
    const status = statuses.find((s) => s.id === t.status_id);
    return status?.is_done;
  }).length;
  const progress = calculateProgress(done, tasks.length);

  return (
    <div
      ref={setNodeRef}
      className={`mb-4 rounded-lg transition-colors ${
        isOver ? 'bg-accent/5 ring-1 ring-accent/20' : ''
      }`}
    >
      <button
        onClick={onToggle}
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

      {expanded && (
        <div className="ml-2 border-l border-border pl-2 min-h-[20px]">
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-muted">
                Drop tasks here
              </p>
            ) : (
              tasks.map((task) => (
                <SortableTaskRow key={task.id} task={task} />
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

// "No Milestone" as a droppable zone
function NoMilestoneDropZone({
  tasks,
  expanded,
  onToggle,
}: {
  tasks: TaskWithRelations[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: NO_MILESTONE });

  return (
    <div
      ref={setNodeRef}
      className={`mt-4 rounded-lg transition-colors ${
        isOver ? 'bg-accent/5 ring-1 ring-accent/20' : ''
      }`}
    >
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 hover:bg-bg-tertiary rounded-lg transition-colors w-full"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
        )}
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
          No Milestone
        </span>
        <span className="text-xs text-text-muted">{tasks.length}</span>
      </button>

      {expanded && (
        <div className="ml-2 border-l border-border pl-2 min-h-[20px]">
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.length === 0 ? (
              <p className="px-3 py-2 text-xs text-text-muted">
                Drop tasks here
              </p>
            ) : (
              tasks.map((task) => (
                <SortableTaskRow key={task.id} task={task} />
              ))
            )}
          </SortableContext>
        </div>
      )}
    </div>
  );
}

// Sortable + draggable task row
function SortableTaskRow({ task }: { task: TaskWithRelations }) {
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
      className={`flex items-center group ${isDragging ? 'opacity-30' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab active:cursor-grabbing text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <div className="flex-1">
        <TaskRow task={task} />
      </div>
    </div>
  );
}
