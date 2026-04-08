'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { Status } from '@/lib/types';

export function StatusManager() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('statuses')
        .select('*')
        .order('order');
      return (data ?? []) as Status[];
    },
  });

  const createStatus = useMutation({
    mutationFn: async () => {
      const maxOrder = Math.max(...statuses.map((s) => s.order), -1);
      const { error } = await supabase.from('statuses').insert({
        name: newName,
        color: newColor,
        order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      setNewName('');
      setNewColor('#6b7280');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Status> & { id: string }) => {
      const { error } = await supabase
        .from('statuses')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });

  const deleteStatus = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('statuses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });

  const setDefault = (id: string) => {
    // Unset current default, set new one
    const current = statuses.find((s) => s.is_default);
    if (current) {
      updateStatus.mutate({ id: current.id, is_default: false });
    }
    updateStatus.mutate({ id, is_default: true });
  };

  return (
    <div>
      <h2 className="text-sm font-medium text-text-primary mb-4">Statuses</h2>

      <div className="space-y-1 mb-4">
        {statuses.map((status) => (
          <div
            key={status.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-bg-tertiary transition-colors"
          >
            <GripVertical className="h-3.5 w-3.5 text-text-muted cursor-grab" />
            <input
              type="color"
              value={status.color}
              onChange={(e) =>
                updateStatus.mutate({ id: status.id, color: e.target.value })
              }
              className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
            />
            <span className="flex-1 text-sm text-text-primary">
              {status.name}
            </span>
            <label className="flex items-center gap-1 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={status.is_done}
                onChange={(e) =>
                  updateStatus.mutate({
                    id: status.id,
                    is_done: e.target.checked,
                  })
                }
                className="rounded"
              />
              Done
            </label>
            <label className="flex items-center gap-1 text-xs text-text-muted">
              <input
                type="radio"
                name="default_status"
                checked={status.is_default}
                onChange={() => setDefault(status.id)}
              />
              Default
            </label>
            <button
              onClick={() => deleteStatus.mutate(status.id)}
              className="text-text-muted hover:text-danger transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
        />
        <input
          placeholder="New status name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName) createStatus.mutate();
          }}
          className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          onClick={() => createStatus.mutate()}
          disabled={!newName}
          className="rounded-lg bg-accent p-1.5 text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
