'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useProjectTasks } from '@/lib/hooks/useTasks';
import { useProjectMilestones } from '@/lib/hooks/useMilestones';
import {
  addDays,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  format,
  eachWeekOfInterval,
  parseISO,
  isValid,
} from 'date-fns';
import type { Status, TaskWithRelations } from '@/lib/types';

interface ProjectTimelineProps {
  projectId: string;
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const supabase = createClient();
  const { data: tasks = [], isLoading: tasksLoading } = useProjectTasks(projectId);
  const { data: milestones = [], isLoading: msLoading } = useProjectMilestones(projectId);

  const { data: statuses = [] } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await supabase.from('statuses').select('*').order('order');
      return (data ?? []) as Status[];
    },
  });

  // Calculate timeline range
  const { rangeStart, rangeEnd, weeks, dayWidth } = useMemo(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = addDays(endOfMonth(addDays(now, 90)), 0); // ~3 months
    const wks = eachWeekOfInterval({ start, end });
    const totalDays = differenceInDays(end, start);
    const dw = Math.max(20, 800 / totalDays); // pixels per day

    return { rangeStart: start, rangeEnd: end, weeks: wks, dayWidth: dw };
  }, []);

  const totalWidth = differenceInDays(rangeEnd, rangeStart) * dayWidth;

  const getBarProps = (task: TaskWithRelations) => {
    const created = parseISO(task.created_at);
    const due = task.due_date ? parseISO(task.due_date) : addDays(created, 14);
    if (!isValid(created) || !isValid(due)) return null;

    const left = Math.max(0, differenceInDays(created, rangeStart) * dayWidth);
    const width = Math.max(dayWidth, differenceInDays(due, created) * dayWidth);
    const status = statuses.find((s) => s.id === task.status_id);

    return { left, width, color: status?.color ?? '#6b7280' };
  };

  if (tasksLoading || msLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  // Tasks that have due dates (for timeline visibility)
  const timelineTasks = tasks.filter((t) => t.due_date);
  const noDateTasks = tasks.filter((t) => !t.due_date);

  return (
    <div className="overflow-x-auto p-4">
      <div style={{ minWidth: totalWidth + 250 }}>
        {/* Week headers */}
        <div className="flex border-b border-border mb-2" style={{ marginLeft: 240 }}>
          {weeks.map((week, i) => (
            <div
              key={i}
              className="text-[10px] text-text-muted border-l border-border px-1 py-1"
              style={{ width: dayWidth * 7 }}
            >
              {format(week, 'MMM d')}
            </div>
          ))}
        </div>

        {/* Milestone rows */}
        {milestones.map((ms) => (
          <div key={ms.id} className="flex items-center h-6 mb-1">
            <div className="w-[240px] flex-shrink-0 truncate px-3 text-xs font-medium text-accent">
              ◆ {ms.title}
            </div>
            <div className="flex-1 relative h-full">
              {ms.deadline && (() => {
                const d = parseISO(ms.deadline);
                if (!isValid(d)) return null;
                const left = differenceInDays(d, rangeStart) * dayWidth;
                return (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 bg-accent"
                    style={{ left }}
                    title={`${ms.title} — ${format(d, 'MMM d')}`}
                  />
                );
              })()}
            </div>
          </div>
        ))}

        {/* Task bars */}
        {timelineTasks.map((task) => {
          const bar = getBarProps(task);
          if (!bar) return null;

          return (
            <div key={task.id} className="flex items-center h-7 mb-0.5">
              <div className="w-[240px] flex-shrink-0 truncate px-3 flex items-center gap-1">
                <span className="text-[10px] font-mono text-text-muted">
                  {task.identifier}
                </span>
                <span className="text-xs text-text-secondary truncate">
                  {task.title}
                </span>
              </div>
              <div className="flex-1 relative h-full flex items-center">
                <div
                  className="absolute h-4 rounded-sm transition-all"
                  style={{
                    left: bar.left,
                    width: bar.width,
                    backgroundColor: bar.color,
                    opacity: 0.7,
                  }}
                  title={task.title}
                />
              </div>
            </div>
          );
        })}

        {/* Tasks without dates */}
        {noDateTasks.length > 0 && (
          <div className="mt-4 px-3">
            <p className="text-xs text-text-muted mb-1">
              {noDateTasks.length} tasks without due date (not shown)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
