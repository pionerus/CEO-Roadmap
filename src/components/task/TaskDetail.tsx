'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useTask, useUpdateTask, useDeleteTask } from '@/lib/hooks/useTasks';
import { useUIStore } from '@/lib/stores/uiStore';
import { SubtaskList } from './SubtaskList';
import { formatDate } from '@/lib/utils/dates';
import type { Status, Profile, ProjectMilestone, Label, Priority, Effort } from '@/lib/types';

export function TaskDetail() {
  const taskId = useUIStore((s) => s.taskDetailId);
  const closeTaskDetail = useUIStore((s) => s.closeTaskDetail);
  const { data: task, isLoading } = useTask(taskId ?? '');
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const supabase = createClient();

  const [title, setTitle] = useState('');

  useEffect(() => {
    if (task) setTitle(task.title);
  }, [task]);

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('statuses').select('*').order('order');
      return (data ?? []) as Status[];
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('name');
      return (data ?? []) as Profile[];
    },
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['milestones', 'project', task?.project_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('project_milestones')
        .select('id, title')
        .eq('project_id', task!.project_id)
        .order('order');
      return (data ?? []) as ProjectMilestone[];
    },
    enabled: !!task?.project_id,
  });

  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      const { data } = await supabase.from('labels').select('*').order('name');
      return (data ?? []) as Label[];
    },
  });

  if (!taskId) return null;

  const handleTitleBlur = () => {
    if (title !== task?.title && title.trim()) {
      updateTask.mutate({ id: taskId, title: title.trim() });
    }
  };

  const handleDelete = () => {
    if (!task) return;
    deleteTask.mutate({ id: taskId, projectId: task.project_id });
    closeTaskDetail();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col border-l border-border bg-bg-secondary shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          {task?.project && (
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: task.project.color }}
            />
          )}
          <span className="text-xs font-mono text-text-muted">
            {task?.identifier}
          </span>
          {task && (
            <span className="text-xs text-text-muted">
              {formatDate(task.created_at)}
            </span>
          )}
        </div>
        <button
          onClick={closeTaskDetail}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : task ? (
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full bg-transparent text-lg font-semibold text-text-primary focus:outline-none"
          />

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Description
            </label>
            <textarea
              defaultValue={task.description ?? ''}
              onBlur={(e) => {
                if (e.target.value !== (task.description ?? '')) {
                  updateTask.mutate({
                    id: task.id,
                    description: e.target.value || null,
                  });
                }
              }}
              rows={3}
              placeholder="Add a description..."
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-y"
            />
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Status
              </label>
              <select
                value={task.status_id}
                onChange={(e) =>
                  updateTask.mutate({ id: task.id, status_id: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) =>
                  updateTask.mutate({
                    id: task.id,
                    priority: e.target.value as Priority,
                  })
                }
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="none">None</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Assignee
              </label>
              <select
                value={task.assignee_id ?? ''}
                onChange={(e) =>
                  updateTask.mutate({
                    id: task.id,
                    assignee_id: e.target.value || null,
                  })
                }
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

            {/* Milestone */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Milestone
              </label>
              <select
                value={task.project_milestone_id ?? ''}
                onChange={(e) =>
                  updateTask.mutate({
                    id: task.id,
                    project_milestone_id: e.target.value || null,
                  })
                }
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

            {/* Effort */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Effort
              </label>
              <select
                value={task.effort ?? ''}
                onChange={(e) =>
                  updateTask.mutate({
                    id: task.id,
                    effort: (e.target.value || null) as Effort | null,
                  })
                }
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">None</option>
                <option value="XS">XS</option>
                <option value="S">S</option>
                <option value="M">M</option>
                <option value="L">L</option>
                <option value="XL">XL</option>
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={task.due_date ?? ''}
                onChange={(e) =>
                  updateTask.mutate({
                    id: task.id,
                    due_date: e.target.value || null,
                  })
                }
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Show in Roadmap */}
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={task.in_roadmap}
              onChange={(e) =>
                updateTask.mutate({
                  id: task.id,
                  in_roadmap: e.target.checked,
                })
              }
              className="rounded border-border"
            />
            Show in Roadmap
          </label>

          {/* Subtasks */}
          <SubtaskList
            taskId={task.id}
            subtasks={task.subtasks ?? []}
          />
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
          Task not found
        </div>
      )}

      {/* Footer */}
      {task && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            onClick={handleDelete}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 transition-colors"
          >
            Delete Task
          </button>
        </div>
      )}
    </div>
  );
}
