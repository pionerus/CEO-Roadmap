'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import type { Label } from '@/lib/types';

export function LabelManager() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const { data: labels = [] } = useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      const { data } = await supabase
        .from('labels')
        .select('*')
        .order('name');
      return (data ?? []) as Label[];
    },
  });

  const createLabel = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('labels')
        .insert({ name: newName, color: newColor });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      setNewName('');
      setNewColor('#6b7280');
    },
  });

  const updateLabel = useMutation({
    mutationFn: async ({
      id,
      name,
      color,
    }: {
      id: string;
      name: string;
      color: string;
    }) => {
      const { error } = await supabase
        .from('labels')
        .update({ name, color })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
      setEditingId(null);
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('labels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels'] });
    },
  });

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  return (
    <div>
      <h2 className="text-sm font-medium text-text-primary mb-4">Labels</h2>

      <div className="space-y-1 mb-4">
        {labels.map((label) => (
          <div
            key={label.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-bg-tertiary transition-colors"
          >
            {editingId === label.id ? (
              <>
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent"
                />
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded border border-border bg-bg-primary px-2 py-0.5 text-sm text-text-primary focus:border-accent focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() =>
                    updateLabel.mutate({
                      id: label.id,
                      name: editName,
                      color: editColor,
                    })
                  }
                  className="text-success"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-text-muted"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: label.color }}
                />
                <span className="flex-1 text-sm text-text-primary">
                  {label.name}
                </span>
                <button
                  onClick={() => startEdit(label)}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteLabel.mutate(label.id)}
                  className="text-text-muted hover:text-danger transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
        {labels.length === 0 && (
          <p className="text-xs text-text-muted px-3">No labels yet</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent"
        />
        <input
          placeholder="New label name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName) createLabel.mutate();
          }}
          className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          onClick={() => createLabel.mutate()}
          disabled={!newName}
          className="rounded-lg bg-accent p-1.5 text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
