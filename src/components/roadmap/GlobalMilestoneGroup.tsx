'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Circle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { TaskRow } from '@/components/task/TaskRow';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { AddLinkDialog } from './AddLinkDialog';
import {
  globalMilestoneProgress,
  milestoneHealth,
  type MilestoneHealth,
} from '@/lib/utils/progress';
import { useDeleteGlobalMilestoneLink } from '@/lib/hooks/useGlobalRoadmap';
import { formatDate } from '@/lib/utils/dates';
import type {
  GlobalMilestoneWithLinks,
  TaskWithRelations,
  ProjectMilestone,
  Status,
  Project,
  Progress,
} from '@/lib/types';

const healthIcons: Record<MilestoneHealth, React.ReactNode> = {
  on_track: <CheckCircle2 className="h-3.5 w-3.5 text-success" />,
  at_risk: <AlertCircle className="h-3.5 w-3.5 text-warning" />,
  behind: <Circle className="h-3.5 w-3.5 text-danger" />,
};

interface Props {
  milestone: GlobalMilestoneWithLinks;
  tasks: TaskWithRelations[];
  projectMilestones: ProjectMilestone[];
  statuses: Status[];
  projects: Project[];
}

export function GlobalMilestoneGroup({
  milestone,
  tasks,
  projectMilestones,
  statuses,
  projects,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [showAddLink, setShowAddLink] = useState(false);
  const deleteLink = useDeleteGlobalMilestoneLink();

  const progress = globalMilestoneProgress(
    milestone.id,
    milestone.links ?? [],
    projectMilestones,
    tasks,
    statuses
  );
  const health = milestoneHealth(milestone, progress);

  // Resolve linked items to display
  const linkedItems: {
    type: 'task' | 'milestone' | 'project';
    label: string;
    linkId: string;
    tasks: TaskWithRelations[];
  }[] = [];

  for (const link of milestone.links ?? []) {
    if (link.task_id) {
      const task = tasks.find((t) => t.id === link.task_id);
      if (task) {
        linkedItems.push({
          type: 'task',
          label: task.identifier,
          linkId: link.id,
          tasks: [task],
        });
      }
    } else if (link.project_milestone_id) {
      const pm = projectMilestones.find(
        (m) => m.id === link.project_milestone_id
      );
      const proj = projects.find((p) => p.id === pm?.project_id);
      const pmTasks = tasks.filter(
        (t) => t.project_milestone_id === link.project_milestone_id
      );
      linkedItems.push({
        type: 'milestone',
        label: `${proj?.name ?? ''} — ${pm?.title ?? ''}`,
        linkId: link.id,
        tasks: pmTasks,
      });
    } else if (link.project_id) {
      const proj = projects.find((p) => p.id === link.project_id);
      const projTasks = tasks.filter(
        (t) => t.project_id === link.project_id
      );
      linkedItems.push({
        type: 'project',
        label: proj?.name ?? '',
        linkId: link.id,
        tasks: projTasks,
      });
    }
  }

  // Also include project milestones linked via global_milestone_id field
  const implicitPMs = projectMilestones.filter(
    (pm) =>
      pm.global_milestone_id === milestone.id &&
      !milestone.links?.some((l) => l.project_milestone_id === pm.id)
  );
  for (const pm of implicitPMs) {
    const proj = projects.find((p) => p.id === pm.project_id);
    const pmTasks = tasks.filter((t) => t.project_milestone_id === pm.id);
    linkedItems.push({
      type: 'milestone',
      label: `${proj?.name ?? ''} — ${pm.title}`,
      linkId: '',
      tasks: pmTasks,
    });
  }

  return (
    <div className="mb-2">
      {/* Header */}
      <div className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-bg-tertiary transition-colors">
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-text-muted" />
          )}
        </button>
        {healthIcons[health]}
        <span className="text-sm font-medium text-text-primary">
          {milestone.title}
        </span>
        {milestone.deadline && (
          <span className="text-xs text-text-muted">
            {formatDate(milestone.deadline)}
          </span>
        )}
        <div className="flex-1 max-w-[140px]">
          <ProgressBar progress={progress} size="sm" />
        </div>
        <button
          onClick={() => setShowAddLink(true)}
          className="text-text-muted hover:text-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Linked items */}
      {expanded && (
        <div className="ml-6">
          {linkedItems.map((item, idx) => (
            <div key={idx} className="mb-2">
              <div className="flex items-center gap-2 px-3 py-1">
                <span className="text-[10px] rounded bg-bg-tertiary px-1.5 py-0.5 text-text-muted uppercase">
                  {item.type}
                </span>
                <span className="text-xs text-text-secondary">
                  {item.label}
                </span>
                {item.linkId && (
                  <button
                    onClick={() => deleteLink.mutate(item.linkId)}
                    className="text-text-muted hover:text-danger transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="ml-2 border-l border-border pl-2">
                {item.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
          {linkedItems.length === 0 && (
            <p className="px-3 py-2 text-xs text-text-muted">
              No linked items. Click + to add.
            </p>
          )}
        </div>
      )}

      <AddLinkDialog
        open={showAddLink}
        onClose={() => setShowAddLink(false)}
        globalMilestoneId={milestone.id}
      />
    </div>
  );
}
