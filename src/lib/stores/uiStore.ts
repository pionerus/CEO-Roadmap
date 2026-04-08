import { create } from 'zustand';

interface UIState {
  taskDetailId: string | null;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  taskDetailId: null,
  openTaskDetail: (taskId) => set({ taskDetailId: taskId }),
  closeTaskDetail: () => set({ taskDetailId: null }),
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
