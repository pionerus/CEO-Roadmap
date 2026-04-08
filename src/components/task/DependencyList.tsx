'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { TaskDependency, DependencyType, Task } from '@/lib/types';

interface DependencyListProps {
  taskId: string;
  dependencies: TaskDependency[];
}

const typeColors: Record<DependencyType, string> = {
  blocks: 'bg-warning/10 text-warning',
  blocked_by: 'bg-danger/10 text-danger',
  related: 'bg-accent/10 text-accent',
};

export function DependencyList({ taskId, dependencies }: DependencyListProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<DependencyType>('blocked_by');
  const [selectedTaskId, setSelectedTaskId] = useState('');

  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-tasks-brief'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, identifier, title')
        .order('identifier');
      return (data ?? []) as Pick<Task, 'id' | 'identifier' | 'title'>[];
    },
    enabled: showAdd,
  });

  const addDependency = useMutation({
    mutationFn: async () => {
      if (!selectedTaskId) return;
      const { error } = await supabase.from('task_dependencies').insert({
        source_task_id: taskId,
        target_task_id: selectedTaskId,
        type: newType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      setShowAdd(false);
      setSelectedTaskId('');
    },
  });

  const removeDependency = useMutation({
    mutationFn: async (depId: string) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('id', depId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  // Resolve target task info
  const { data: depTasks = [] } = useQuery({
    queryKey: ['dep-tasks', taskId],
    queryFn: async () => {
      const ids = dependencies.map((d) => d.target_task_id);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from('tasks')
        .select('id, identifier, title')
        .in('id', ids);
      return (data ?? []) as Pick<Task, 'id' | 'identifier' | 'title'>[];
    },
    enabled: dependencies.length > 0,
  });

  const getTargetTask = (targetId: string) =>
    depTasks.find((t) => t.id === targetId);

  // Filter out self and already-linked tasks from dropdown
  const existingTargetIds = new Set(dependencies.map((d) => d.target_task_id));
  const availableTasks = allTasks.filter(
    (t) => t.id !== taskId && !existingTargetIds.has(t.id)
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary">
          Dependencies
        </span>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="text-text-muted hover:text-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {dependencies.length > 0 && (
        <div className="space-y-1 mb-2">
          {dependencies.map((dep) => {
            const target = getTargetTask(dep.target_task_id);
            return (
              <div
                key={dep.id}
                className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-bg-tertiary transition-colors"
              >
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${typeColors[dep.type]}`}
                >
                  {dep.type.replace('_', ' ')}
                </span>
                <span className="text-xs font-mono text-text-muted">
                  {target?.identifier ?? '...'}
                </span>
                <span className="flex-1 text-xs text-text-secondary truncate">
                  {target?.title ?? ''}
                </span>
                <button
                  onClick={() => removeDependency.mutate(dep.id)}
                  className="hidden text-text-muted hover:text-danger group-hover:block transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <div className="flex items-center gap-2 mt-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as DependencyType)}
            className="rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="blocked_by">blocked by</option>
            <option value="blocks">blocks</option>
            <option value="related">related</option>
          </select>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="flex-1 rounded border border-border bg-bg-primary px-2 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            <option value="">Select task...</option>
            {availableTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.identifier} — {t.title}
              </option>
            ))}
          </select>
          <button
            onClick={() => addDependency.mutate()}
            disabled={!selectedTaskId || addDependency.isPending}
            className="rounded bg-accent px-2 py-1 text-xs text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      )}

      {dependencies.length === 0 && !showAdd && (
        <p className="text-xs text-text-muted">No dependencies</p>
      )}
    </div>
  );
}
