'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/shared/Modal';
import { useCreateTask } from '@/lib/hooks/useTasks';
import { createClient } from '@/lib/supabase/client';
import { generateIdentifier } from '@/lib/utils/identifiers';
import type { Status, ProjectMilestone, Profile, Priority } from '@/lib/types';

interface CreateTaskDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectPrefix: string;
}

export function CreateTaskDialog({
  open,
  onClose,
  projectId,
  projectPrefix,
}: CreateTaskDialogProps) {
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('none');
  const [milestoneId, setMilestoneId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const createTask = useCreateTask();

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('statuses').select('*').order('order');
      return (data ?? []) as Status[];
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', 'project', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_milestones')
        .select('id, title')
        .eq('project_id', projectId)
        .order('order');
      return (data ?? []) as ProjectMilestone[];
    },
    enabled: !!projectId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('name');
      return (data ?? []) as Profile[];
    },
  });

  const defaultStatus = statuses.find((s) => s.is_default);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!title) return;
    if (!defaultStatus) {
      setError('No default status found. Go to Settings > Statuses and set a default.');
      return;
    }
    setError('');

    try {
      const identifier = await generateIdentifier(supabase, projectId, projectPrefix);

      await createTask.mutateAsync({
        project_id: projectId,
        title,
        identifier,
        status_id: defaultStatus.id,
        priority,
        project_milestone_id: milestoneId || null,
        assignee_id: assigneeId || null,
        in_roadmap: false,
      } as any);

      onClose();
      setTitle('');
      setPriority('none');
      setMilestoneId('');
      setAssigneeId('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create task');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title) handleSubmit();
            }}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="none">None</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Milestone
            </label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">None</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-danger">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || createTask.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
