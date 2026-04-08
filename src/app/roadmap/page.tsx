'use client';

import { useState } from 'react';
import { Map } from 'lucide-react';
import { RoadmapList } from '@/components/roadmap/RoadmapList';
import { CreateGlobalMilestoneDialog } from '@/components/roadmap/CreateGlobalMilestoneDialog';
import { TaskDetail } from '@/components/task/TaskDetail';
import { useGlobalMilestones } from '@/lib/hooks/useGlobalRoadmap';
import { useUIStore } from '@/lib/stores/uiStore';
import { useAuth } from '@/components/layout/AuthGuard';

export default function RoadmapPage() {
  const [view, setView] = useState<'list' | 'dashboard'>('list');
  const [showCreate, setShowCreate] = useState(false);
  const { data: milestones = [] } = useGlobalMilestones();
  const taskDetailId = useUIStore((s) => s.taskDetailId);
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Map className="h-5 w-5 text-text-tertiary" />
          <h1 className="text-lg font-semibold text-text-primary">Roadmap</h1>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowCreate(true)}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
            >
              + Milestone
            </button>
          )}
          <div className="ml-4 flex items-center gap-1">
            <button
              onClick={() => setView('list')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'list'
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('dashboard')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                view === 'dashboard'
                  ? 'bg-bg-tertiary text-text-primary'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {milestones.length === 0 ? (
          <div className="flex flex-1 items-center justify-center h-full">
            <div className="text-center">
              <Map className="mx-auto h-12 w-12 text-text-muted" />
              <h2 className="mt-4 text-lg font-medium text-text-primary">
                No milestones yet
              </h2>
              <p className="mt-1 text-sm text-text-tertiary">
                Create global milestones and link project items to build your
                roadmap.
              </p>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
                >
                  Create Milestone
                </button>
              )}
            </div>
          </div>
        ) : view === 'list' ? (
          <RoadmapList />
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">
            Dashboard view — Phase 5
          </div>
        )}
      </div>

      {/* Task Detail */}
      {taskDetailId && <TaskDetail />}

      <CreateGlobalMilestoneDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}
