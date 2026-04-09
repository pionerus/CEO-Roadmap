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
  X,
} from 'lucide-react';
import { TaskRow } from '@/components/task/TaskRow';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { AddLinkDialog } from './AddLinkDialog';
import {
  globalMilestoneProgress,
  milestoneHealth,
  calculateProgress,
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
  const [blockedPopup, setBlockedPopup] = useState<TaskWithRelations[] | null>(null);
  const deleteLink = useDeleteGlobalMilestoneLink();

  const progress = globalMilestoneProgress(
    milestone.id,
    milestone.links ?? [],
    projectMilestones,
    tasks,
    statuses
  );
  const health = milestoneHealth(milestone, progress);

  // Resolve linked items
  const linkedItems: {
    type: 'task' | 'milestone' | 'project';
    label: string;
    linkId: string;
    tasks: TaskWithRelations[];
    totalCount: number;
    doneCount: number;
    blockedCount: number;
  }[] = [];

  const countStats = (itemTasks: TaskWithRelations[]) => {
    const total = itemTasks.length;
    const done = itemTasks.filter((t) => {
      const s = statuses.find((s) => s.id === t.status_id);
      return s?.is_done;
    }).length;
    const blocked = itemTasks.filter((t) => {
      const deps = t.task_dependencies ?? [];
      return deps.some(
        (d) =>
          (d.type === 'blocked_by' && d.source_task_id === t.id) ||
          (d.type === 'blocks' && d.target_task_id === t.id)
      );
    }).length;
    return { totalCount: total, doneCount: done, blockedCount: blocked };
  };

  for (const link of milestone.links ?? []) {
    if (link.task_id) {
      const task = tasks.find((t) => t.id === link.task_id);
      if (task) {
        linkedItems.push({
          type: 'task',
          label: task.identifier,
          linkId: link.id,
          tasks: [task],
          ...countStats([task]),
        });
      }
    } else if (link.project_milestone_id) {
      const pm = projectMilestones.find((m) => m.id === link.project_milestone_id);
      const proj = projects.find((p) => p.id === pm?.project_id);
      const pmTasks = tasks.filter((t) => t.project_milestone_id === link.project_milestone_id);
      linkedItems.push({
        type: 'milestone',
        label: `${proj?.name ?? ''} — ${pm?.title ?? ''}`,
        linkId: link.id,
        tasks: pmTasks,
        ...countStats(pmTasks),
      });
    } else if (link.project_id) {
      const proj = projects.find((p) => p.id === link.project_id);
      const projTasks = tasks.filter((t) => t.project_id === link.project_id);
      linkedItems.push({
        type: 'project',
        label: proj?.name ?? '',
        linkId: link.id,
        tasks: projTasks,
        ...countStats(projTasks),
      });
    }
  }

  // Implicit links via global_milestone_id
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
      ...countStats(pmTasks),
    });
  }

  // Total blocked across all linked items
  const totalBlocked = linkedItems.reduce((sum, item) => sum + item.blockedCount, 0);
  const allBlockedTasks = linkedItems.flatMap((item) =>
    item.tasks.filter((t) => {
      const deps = t.task_dependencies ?? [];
      return deps.some(
        (d) =>
          (d.type === 'blocked_by' && d.source_task_id === t.id) ||
          (d.type === 'blocks' && d.target_task_id === t.id)
      );
    })
  );

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
        {/* Blocked count — clickable */}
        {totalBlocked > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setBlockedPopup(allBlockedTasks);
            }}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors tabular-nums"
          >
            {totalBlocked} blocked
          </button>
        )}
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
                {/* Task count */}
                <span className="text-[10px] text-text-muted tabular-nums">
                  {item.doneCount}/{item.totalCount} done
                </span>
                {/* Blocked count for this item */}
                {item.blockedCount > 0 && (
                  <button
                    onClick={() => {
                      const blocked = item.tasks.filter((t) => {
                        const deps = t.task_dependencies ?? [];
                        return deps.some(
                          (d) =>
                            (d.type === 'blocked_by' && d.source_task_id === t.id) ||
                            (d.type === 'blocks' && d.target_task_id === t.id)
                        );
                      });
                      setBlockedPopup(blocked);
                    }}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors tabular-nums"
                  >
                    {item.blockedCount} blocked
                  </button>
                )}
                {item.linkId && (
                  <button
                    onClick={() => deleteLink.mutate(item.linkId)}
                    className="text-text-muted hover:text-danger transition-colors ml-auto"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="ml-2 border-l border-border pl-2">
                {item.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} allTasks={tasks} />
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

      {/* Blocked Tasks Popup */}
      {blockedPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setBlockedPopup(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-bg-secondary shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-text-primary">
                Blocked Tasks ({blockedPopup.length})
              </h2>
              <button
                onClick={() => setBlockedPopup(null)}
                className="text-text-muted hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-3 space-y-1">
              {blockedPopup.map((task) => {
                const st = statuses.find((s) => s.id === task.status_id);
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 bg-bg-primary border border-border"
                  >
                    {st && (
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: st.color }}
                        title={st.name}
                      />
                    )}
                    <span className="text-xs font-mono text-text-muted">
                      {task.identifier}
                    </span>
                    <span className="flex-1 text-sm text-text-primary truncate">
                      {task.title}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: st ? `${st.color}20` : undefined,
                        color: st?.color,
                      }}
                    >
                      {st?.name}
                    </span>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-danger/10 text-danger">
                      blocked
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
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
