'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useCreateSubtask, useUpdateSubtask, useDeleteSubtask } from '@/lib/hooks/useTasks';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { calculateProgress } from '@/lib/utils/progress';
import type { Subtask } from '@/lib/types';

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
}

export function SubtaskList({ taskId, subtasks }: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState('');
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  const sorted = [...subtasks].sort((a, b) => a.order - b.order);
  const done = sorted.filter((s) => s.done).length;
  const progress = calculateProgress(done, sorted.length);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createSubtask.mutate({
      task_id: taskId,
      title: newTitle.trim(),
      order: sorted.length,
    });
    setNewTitle('');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary">
          Subtasks
        </span>
        {sorted.length > 0 && (
          <div className="w-24">
            <ProgressBar progress={progress} size="sm" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        {sorted.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-2 rounded px-2 py-1 hover:bg-bg-tertiary transition-colors"
          >
            <input
              type="checkbox"
              checked={subtask.done}
              onChange={(e) =>
                updateSubtask.mutate({
                  id: subtask.id,
                  task_id: taskId,
                  done: e.target.checked,
                })
              }
              className="rounded border-border"
            />
            <span
              className={`flex-1 text-sm ${
                subtask.done
                  ? 'text-text-muted line-through'
                  : 'text-text-primary'
              }`}
            >
              {subtask.title}
            </span>
            <button
              onClick={() =>
                deleteSubtask.mutate({ id: subtask.id, taskId })
              }
              className="hidden text-text-muted hover:text-danger group-hover:block transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder="Add subtask..."
          className="flex-1 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim()}
          className="text-text-muted hover:text-accent disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
