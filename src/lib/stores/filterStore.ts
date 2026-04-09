import { create } from 'zustand';
import type { Priority } from '@/lib/types';

interface FilterState {
  hideDone: boolean;
  toggleHideDone: () => void;
  priorityFilter: Priority | 'all';
  setPriorityFilter: (p: Priority | 'all') => void;
  assigneeFilter: string | 'all';
  setAssigneeFilter: (id: string | 'all') => void;
  labelFilter: string | 'all';
  setLabelFilter: (id: string | 'all') => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  hideDone: false,
  toggleHideDone: () => set((s) => ({ hideDone: !s.hideDone })),
  priorityFilter: 'all',
  setPriorityFilter: (p) => set({ priorityFilter: p }),
  assigneeFilter: 'all',
  setAssigneeFilter: (id) => set({ assigneeFilter: id }),
  labelFilter: 'all',
  setLabelFilter: (id) => set({ labelFilter: id }),
}));
