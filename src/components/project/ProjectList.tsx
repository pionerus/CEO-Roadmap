'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useProjectMilestones } from '@/lib/hooks/useMilestones';
import { useProjectTasks, useReorderTasks } from '@/lib/hooks/useTasks';
import { MilestoneGroup } from './MilestoneGroup';
import { TaskRow } from '@/components/task/TaskRow';
import { SortableList } from '@/components/shared/SortableList';
import type { Status, TaskWithRelations } from '@/lib/types';

interface ProjectListProps {
  projectId: string;
}

export function ProjectList({ projectId }: ProjectListProps) {
  const supabase = createClient();
  const { data: milestones = [], isLoading: milestonesLoading } =
    useProjectMilestones(projectId);
  const { data: allTasks = [], isLoading: tasksLoading } =
    useProjectTasks(projectId);
  const reorderTasks = useReorderTasks();

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

  if (milestonesLoading || tasksLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // Tasks not assigned to any milestone
  const unassignedTasks = allTasks.filter(
    (t) => !t.project_milestone_id
  ) as TaskWithRelations[];

  const handleReorder = (newOrder: string[]) => {
    // Build full order: milestone tasks first (by milestone order), then unassigned
    const allIds: string[] = [];
    for (const ms of milestones) {
      for (const t of ms.tasks) {
        allIds.push(t.id);
      }
    }
    // Replace unassigned portion with new order
    const milestoneTaskIds = new Set(allIds);
    const reorderedAll = [
      ...allIds,
      ...newOrder.filter((id) => !milestoneTaskIds.has(id)),
    ];
    reorderTasks.mutate({ projectId, orderedIds: reorderedAll });
  };

  return (
    <div className="p-4">
      {milestones.map((milestone) => (
        <MilestoneGroup
          key={milestone.id}
          milestone={milestone}
          statuses={statuses}
          projectId={projectId}
        />
      ))}

      {unassignedTasks.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
              No Milestone
            </span>
            <span className="text-xs text-text-muted">
              {unassignedTasks.length}
            </span>
          </div>
          <div className="ml-2 border-l border-border pl-2">
            <SortableList
              items={unassignedTasks}
              onReorder={handleReorder}
              renderItem={(task) => <TaskRow key={task.id} task={task} />}
            />
          </div>
        </div>
      )}

      {milestones.length === 0 && unassignedTasks.length === 0 && (
        <div className="flex items-center justify-center py-12 text-sm text-text-muted">
          No milestones or tasks yet
        </div>
      )}
    </div>
  );
}
