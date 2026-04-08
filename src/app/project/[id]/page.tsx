'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Folder } from 'lucide-react';
import type { Project } from '@/lib/types';

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const supabase = createClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      return data as Project | null;
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-tertiary">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-lg font-semibold text-text-primary">
            {project.name}
          </h1>
          <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-xs font-mono text-text-muted">
            {project.prefix}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-secondary">
            List
          </button>
          <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors">
            Kanban
          </button>
          <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors">
            Timeline
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Folder className="mx-auto h-12 w-12 text-text-muted" />
          <h2 className="mt-4 text-lg font-medium text-text-primary">
            No tasks yet
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            Create milestones and tasks to organize your project.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-tertiary transition-colors">
              + Milestone
            </button>
            <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">
              + Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
