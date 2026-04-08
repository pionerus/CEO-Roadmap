'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/shared/Modal';
import { createClient } from '@/lib/supabase/client';
import { useCreateGlobalMilestoneLink } from '@/lib/hooks/useGlobalRoadmap';
import type { Project, ProjectMilestone, Task } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  globalMilestoneId: string;
}

type LinkType = 'project' | 'milestone' | 'task';

export function AddLinkDialog({ open, onClose, globalMilestoneId }: Props) {
  const supabase = createClient();
  const [linkType, setLinkType] = useState<LinkType>('milestone');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const createLink = useCreateGlobalMilestoneLink();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await supabase.from('projects').select('*').order('name');
      return (data ?? []) as Project[];
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['all-project-milestones'],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_milestones')
        .select('*, projects(name)')
        .order('order');
      return (data ?? []) as (ProjectMilestone & { projects: { name: string } })[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['all-tasks-for-linking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, identifier, title, project_id, projects(name)')
        .order('identifier');
      return (data ?? []) as unknown as (Task & { projects: { name: string } })[];
    },
  });

  const handleSubmit = async () => {
    const link: any = { global_milestone_id: globalMilestoneId };

    if (linkType === 'project' && selectedProjectId) {
      link.project_id = selectedProjectId;
    } else if (linkType === 'milestone' && selectedMilestoneId) {
      link.project_milestone_id = selectedMilestoneId;
    } else if (linkType === 'task' && selectedTaskId) {
      link.task_id = selectedTaskId;
    } else {
      return;
    }

    await createLink.mutateAsync(link);
    onClose();
    setSelectedProjectId('');
    setSelectedMilestoneId('');
    setSelectedTaskId('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Link to Roadmap">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Link Type
          </label>
          <div className="flex gap-1">
            {(['project', 'milestone', 'task'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setLinkType(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  linkType === t
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {linkType === 'project' && (
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">Select project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {linkType === 'milestone' && (
          <select
            value={selectedMilestoneId}
            onChange={(e) => setSelectedMilestoneId(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">Select milestone...</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.projects?.name} — {m.title}
              </option>
            ))}
          </select>
        )}

        {linkType === 'task' && (
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">Select task...</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.identifier} — {t.title}
              </option>
            ))}
          </select>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createLink.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Link
          </button>
        </div>
      </div>
    </Modal>
  );
}
