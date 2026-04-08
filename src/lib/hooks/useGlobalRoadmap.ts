import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type {
  GlobalMilestone,
  GlobalMilestoneLink,
  GlobalMilestoneWithLinks,
  Task,
  TaskWithRelations,
  ProjectMilestone,
  Status,
} from '@/lib/types';

const supabase = createClient();

export function useGlobalMilestones() {
  return useQuery({
    queryKey: ['global-milestones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_milestones')
        .select('*, global_milestone_links(*)')
        .order('target_month', { ascending: true })
        .order('order', { ascending: true });
      if (error) throw error;
      return data as GlobalMilestoneWithLinks[];
    },
  });
}

export function useCreateGlobalMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      milestone: Omit<GlobalMilestone, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('global_milestones')
        .insert(milestone)
        .select()
        .single();
      if (error) throw error;
      return data as GlobalMilestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-milestones'] });
    },
  });
}

export function useUpdateGlobalMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<GlobalMilestone> & { id: string }) => {
      const { data, error } = await supabase
        .from('global_milestones')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as GlobalMilestone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-milestones'] });
    },
  });
}

export function useDeleteGlobalMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('global_milestones')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-milestones'] });
    },
  });
}

// Links
export function useCreateGlobalMilestoneLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      link: Omit<GlobalMilestoneLink, 'id' | 'created_at'>
    ) => {
      const { data, error } = await supabase
        .from('global_milestone_links')
        .insert(link)
        .select()
        .single();
      if (error) throw error;
      return data as GlobalMilestoneLink;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-data'] });
    },
  });
}

export function useDeleteGlobalMilestoneLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('global_milestone_links')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['global-milestones'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-data'] });
    },
  });
}

// Full roadmap data — all tasks, milestones, statuses needed for progress calculation
export function useRoadmapData() {
  return useQuery({
    queryKey: ['roadmap-data'],
    queryFn: async () => {
      const [tasksRes, milestonesRes, statusesRes, projectsRes] =
        await Promise.all([
          supabase.from('tasks').select(
            '*, subtasks(*), task_dependencies(*), status:statuses(*), assignee:profiles(*), project:projects(*)'
          ),
          supabase
            .from('project_milestones')
            .select('*')
            .order('order'),
          supabase.from('statuses').select('*').order('order'),
          supabase.from('projects').select('*').order('name'),
        ]);

      return {
        tasks: (tasksRes.data ?? []) as TaskWithRelations[],
        projectMilestones: (milestonesRes.data ?? []) as ProjectMilestone[],
        statuses: (statusesRes.data ?? []) as Status[],
        projects: projectsRes.data ?? [],
      };
    },
  });
}
