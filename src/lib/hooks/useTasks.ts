import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Task, Subtask, TaskWithRelations } from '@/lib/types';

const supabase = createClient();

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', 'project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          '*, subtasks(*), task_labels(label_id), task_dependencies!task_dependencies_source_task_id_fkey(*), status:statuses(*), assignee:profiles!tasks_assignee_id_fkey(*)'
        )
        .eq('project_id', projectId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data as TaskWithRelations[];
    },
    enabled: !!projectId,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          '*, subtasks(*), task_labels(label_id), task_dependencies!task_dependencies_source_task_id_fkey(*), status:statuses(*), assignee:profiles!tasks_assignee_id_fkey(*), project:projects(*)'
        )
        .eq('id', taskId)
        .single();
      if (error) throw error;
      return data as TaskWithRelations;
    },
    enabled: !!taskId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      task: Omit<Task, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'project', data.project_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['milestones', 'project', data.project_id],
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Task> & { id: string }) => {
      // Fetch old values for activity logging
      const { data: oldTask } = await supabase
        .from('tasks')
        .select('status_id, priority, assignee_id')
        .eq('id', id)
        .single();

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Log activity for key field changes (fire-and-forget)
      const logFields = [
        { field: 'status', key: 'status_id' as const },
        { field: 'priority', key: 'priority' as const },
        { field: 'assignee', key: 'assignee_id' as const },
      ];
      for (const { field, key } of logFields) {
        if (key in updates && oldTask && (oldTask as Record<string, unknown>)[key] !== (updates as Record<string, unknown>)[key]) {
          fetch('/api/activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: id,
              action: `${field}_changed`,
              field,
              old_value: String((oldTask as Record<string, unknown>)[key] ?? ''),
              new_value: String((updates as Record<string, unknown>)[key] ?? ''),
            }),
          }).catch(() => {});
        }
      }

      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'project', data.project_id],
      });
      queryClient.invalidateQueries({ queryKey: ['task', data.id] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: string;
      projectId: string;
    }) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'project', data.projectId],
      });
    },
  });
}

// Subtasks
export function useCreateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subtask: {
      task_id: string;
      title: string;
      order: number;
    }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .insert(subtask)
        .select()
        .single();
      if (error) throw error;
      return data as Subtask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.task_id] });
    },
  });
}

export function useUpdateSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      task_id,
      ...updates
    }: Partial<Subtask> & { id: string; task_id: string }) => {
      const { data, error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return { ...data, task_id } as Subtask;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.task_id] });
    },
  });
}

export function useDeleteSubtask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      taskId,
    }: {
      id: string;
      taskId: string;
    }) => {
      const { error } = await supabase.from('subtasks').delete().eq('id', id);
      if (error) throw error;
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
    },
  });
}

// Reorder tasks — update order for a batch of task IDs
export function useReorderTasks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      orderedIds,
    }: {
      projectId: string;
      orderedIds: string[];
    }) => {
      // Update each task's order in parallel
      const updates = orderedIds.map((id, index) =>
        supabase.from('tasks').update({ order: index }).eq('id', id)
      );
      await Promise.all(updates);
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'project', data.projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['milestones', 'project', data.projectId],
      });
    },
  });
}
