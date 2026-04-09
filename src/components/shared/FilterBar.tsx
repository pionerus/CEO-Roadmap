'use client';

import { useQuery } from '@tanstack/react-query';
import { Filter, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFilterStore } from '@/lib/stores/filterStore';
import type { Profile, Label, Priority } from '@/lib/types';

export function FilterBar() {
  const supabase = createClient();
  const {
    hideDone,
    toggleHideDone,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
  } = useFilterStore();

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('name');
      return (data ?? []) as Profile[];
    },
  });

  const hasActiveFilters =
    hideDone || priorityFilter !== 'all' || assigneeFilter !== 'all';

  return (
    <div className="flex items-center gap-2 text-xs">
      <Filter className="h-3.5 w-3.5 text-text-muted" />

      {/* Hide/Show done */}
      <button
        onClick={toggleHideDone}
        className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors ${
          hideDone
            ? 'bg-accent/10 text-accent'
            : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
        }`}
      >
        {hideDone ? (
          <EyeOff className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
        {hideDone ? 'Done hidden' : 'Show all'}
      </button>

      {/* Priority filter */}
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
        className={`rounded-lg border-0 bg-transparent px-2 py-1 transition-colors focus:outline-none ${
          priorityFilter !== 'all'
            ? 'bg-accent/10 text-accent'
            : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        <option value="all">All priorities</option>
        <option value="urgent">Urgent</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="none">None</option>
      </select>

      {/* Assignee filter */}
      <select
        value={assigneeFilter}
        onChange={(e) => setAssigneeFilter(e.target.value)}
        className={`rounded-lg border-0 bg-transparent px-2 py-1 transition-colors focus:outline-none ${
          assigneeFilter !== 'all'
            ? 'bg-accent/10 text-accent'
            : 'text-text-muted hover:text-text-secondary'
        }`}
      >
        <option value="all">All assignees</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            if (hideDone) toggleHideDone();
            setPriorityFilter('all');
            setAssigneeFilter('all');
          }}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
