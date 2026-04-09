import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Task, Project, GlobalMilestone } from '@/lib/types';

const supabase = createClient();

export interface SearchResult {
  type: 'task' | 'project' | 'milestone';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

export function useSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!query || query.length < 2) return [];

      const results: SearchResult[] = [];
      const q = `%${query}%`;

      // Search tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, identifier, title, project_id, projects(name, color)')
        .or(`title.ilike.${q},identifier.ilike.${q}`)
        .limit(10);

      for (const t of (tasks ?? []) as any[]) {
        results.push({
          type: 'task',
          id: t.id,
          title: `${t.identifier} — ${t.title}`,
          subtitle: t.projects?.name,
          url: `/project/${t.project_id}`,
        });
      }

      // Search projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, prefix')
        .or(`name.ilike.${q},prefix.ilike.${q}`)
        .limit(5);

      for (const p of (projects ?? []) as Project[]) {
        results.push({
          type: 'project',
          id: p.id,
          title: p.name,
          subtitle: p.prefix,
          url: `/project/${p.id}`,
        });
      }

      // Search global milestones
      const { data: milestones } = await supabase
        .from('global_milestones')
        .select('id, title, target_month')
        .ilike('title', q)
        .limit(5);

      for (const m of (milestones ?? []) as GlobalMilestone[]) {
        results.push({
          type: 'milestone',
          id: m.id,
          title: m.title,
          subtitle: m.target_month,
          url: '/roadmap',
        });
      }

      return results;
    },
    enabled: query.length >= 2,
    staleTime: 0,
  });
}
