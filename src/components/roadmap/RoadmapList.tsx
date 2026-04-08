'use client';

import {
  useGlobalMilestones,
  useRoadmapData,
} from '@/lib/hooks/useGlobalRoadmap';
import { GlobalMilestoneGroup } from './GlobalMilestoneGroup';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { globalMilestoneProgress, calculateProgress } from '@/lib/utils/progress';
import { formatMonth } from '@/lib/utils/dates';

export function RoadmapList() {
  const { data: globalMilestones = [], isLoading: gmLoading } =
    useGlobalMilestones();
  const { data: roadmapData, isLoading: dataLoading } = useRoadmapData();

  if (gmLoading || dataLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const { tasks = [], projectMilestones = [], statuses = [], projects = [] } =
    roadmapData ?? {};

  // Group by month
  const monthGroups = new Map<
    string,
    typeof globalMilestones
  >();
  for (const gm of globalMilestones) {
    const month = gm.target_month;
    if (!monthGroups.has(month)) {
      monthGroups.set(month, []);
    }
    monthGroups.get(month)!.push(gm);
  }

  // Overall progress
  let totalDone = 0;
  let totalAll = 0;
  for (const gm of globalMilestones) {
    const p = globalMilestoneProgress(
      gm.id,
      gm.links ?? [],
      projectMilestones,
      tasks,
      statuses
    );
    totalDone += p.done;
    totalAll += p.total;
  }
  const overallProgress = calculateProgress(totalDone, totalAll);

  if (globalMilestones.length === 0) {
    return null; // handled by parent empty state
  }

  return (
    <div className="p-4">
      {/* Overall progress */}
      <div className="mb-6 rounded-lg border border-border bg-bg-secondary p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            Overall Progress
          </span>
          <span className="text-sm font-semibold text-accent tabular-nums">
            {overallProgress.percentage}%
          </span>
        </div>
        <ProgressBar progress={overallProgress} size="md" showLabel />
      </div>

      {/* Month groups */}
      {Array.from(monthGroups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, milestones]) => {
          // Month-level progress
          let monthDone = 0;
          let monthTotal = 0;
          for (const gm of milestones) {
            const p = globalMilestoneProgress(
              gm.id,
              gm.links ?? [],
              projectMilestones,
              tasks,
              statuses
            );
            monthDone += p.done;
            monthTotal += p.total;
          }
          const monthProgress = calculateProgress(monthDone, monthTotal);

          return (
            <div key={month} className="mb-6">
              {/* Month header */}
              <div className="flex items-center gap-3 mb-2 px-3">
                <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  {formatMonth(month)}
                </h2>
                <div className="flex-1 max-w-[160px]">
                  <ProgressBar progress={monthProgress} size="sm" />
                </div>
                <span className="text-xs text-text-muted tabular-nums">
                  {monthProgress.percentage}%
                </span>
              </div>

              {/* Milestones in this month */}
              {milestones.map((gm) => (
                <GlobalMilestoneGroup
                  key={gm.id}
                  milestone={gm}
                  tasks={tasks}
                  projectMilestones={projectMilestones}
                  statuses={statuses}
                  projects={projects}
                />
              ))}
            </div>
          );
        })}
    </div>
  );
}
