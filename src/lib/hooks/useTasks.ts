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
          '*, subtasks(*), task_labels(label_id), task_dependencies(*), status:statuses(*), assignee:profiles(*)'
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
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
          '*, subtasks(*), task_labels(label_id), task_dependencies(*), status:statuses(*), assignee:profiles(*), project:projects(*)'
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
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
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
