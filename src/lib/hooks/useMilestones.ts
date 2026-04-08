import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ProjectMilestone, ProjectMilestoneWithTasks } from '@/lib/types';

const supabase = createClient();

export function useProjectMilestones(projectId: string) {
  return useQuery({
    queryKey: ['milestones', 'project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select(
          '*, tasks(*, subtasks(*), task_labels(label_id), task_dependencies(*), status:statuses(*), assignee:profiles(*))'
        )
        .eq('project_id', projectId)
        .order('order', { ascending: true });
      if (error) throw error;
      return data as ProjectMilestoneWithTasks[];
    },
    enabled: !!projectId,
  });
}

export function useCreateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      milestone: Omit<ProjectMilestone, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .insert(milestone)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectMilestone;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['milestones', 'project', data.project_id],
      });
    },
  });
}

export function useUpdateMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<ProjectMilestone> & { id: string }) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProjectMilestone;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['milestones', 'project', data.project_id],
      });
    },
  });
}

export function useDeleteMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: string;
      projectId: string;
    }) => {
      const { error } = await supabase
        .from('project_milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['milestones', 'project', data.projectId],
      });
    },
  });
}
