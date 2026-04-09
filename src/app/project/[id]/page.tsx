'use client';

import { use, useState } from 'react';
import { useProject } from '@/lib/hooks/useProjects';
import { ProjectList } from '@/components/project/ProjectList';
import { ProjectKanban } from '@/components/project/ProjectKanban';
import { ProjectTimeline } from '@/components/project/ProjectTimeline';
import { CreateMilestoneDialog } from '@/components/project/CreateMilestoneDialog';
import { CreateTaskDialog } from '@/components/task/CreateTaskDialog';
import { TaskDetail } from '@/components/task/TaskDetail';
import { useUIStore } from '@/lib/stores/uiStore';
import { FilterBar } from '@/components/shared/FilterBar';
import { Folder } from 'lucide-react';

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: project, isLoading } = useProject(id);
  const taskDetailId = useUIStore((s) => s.taskDetailId);
  const [showCreateMilestone, setShowCreateMilestone] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [view, setView] = useState<'list' | 'kanban' | 'timeline'>('list');

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-text-tertiary">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-lg font-semibold text-text-primary">
            {project.name}
          </h1>
          <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-xs font-mono text-text-muted">
            {project.prefix}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateMilestone(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            + Milestone
          </button>
          <button
            onClick={() => setShowCreateTask(true)}
            className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-hover transition-colors"
          >
            + Task
          </button>
          <div className="ml-4 flex items-center gap-1">
            {(['list', 'kanban', 'timeline'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  view === v
                    ? 'bg-bg-tertiary text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b border-border px-6 py-2">
        <FilterBar />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === 'list' && <ProjectList projectId={id} />}
        {view === 'kanban' && <ProjectKanban projectId={id} />}
        {view === 'timeline' && <ProjectTimeline projectId={id} />}
      </div>

      {/* Task Detail side panel */}
      {taskDetailId && <TaskDetail />}

      {/* Dialogs */}
      <CreateMilestoneDialog
        open={showCreateMilestone}
        onClose={() => setShowCreateMilestone(false)}
        projectId={id}
      />
      <CreateTaskDialog
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        projectId={id}
        projectPrefix={project.prefix}
      />
    </div>
  );
}
