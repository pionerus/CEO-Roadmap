'use client';

import {
  useGlobalMilestones,
  useRoadmapData,
} from '@/lib/hooks/useGlobalRoadmap';
import {
  globalMilestoneProgress,
  milestoneHealth,
  calculateProgress,
  type MilestoneHealth,
} from '@/lib/utils/progress';
import { formatMonth, formatDate } from '@/lib/utils/dates';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircle2, AlertCircle, Circle } from 'lucide-react';

const healthLabels: Record<MilestoneHealth, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: '#22c55e' },
  at_risk: { label: 'At Risk', color: '#f59e0b' },
  behind: { label: 'Behind', color: '#ef4444' },
};

const healthIcons: Record<MilestoneHealth, React.ReactNode> = {
  on_track: <CheckCircle2 className="h-4 w-4 text-success" />,
  at_risk: <AlertCircle className="h-4 w-4 text-warning" />,
  behind: <Circle className="h-4 w-4 text-danger" />,
};

export function RoadmapDashboard() {
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

  const { tasks = [], projectMilestones = [], statuses = [] } =
    roadmapData ?? {};

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
  const overallPct = totalAll === 0 ? 0 : Math.round((totalDone / totalAll) * 100);

  // Donut data
  const donutData = [
    { name: 'Done', value: totalDone, fill: '#22c55e' },
    { name: 'Remaining', value: totalAll - totalDone, fill: '#27272a' },
  ];

  // Per-month bar data
  const monthMap = new Map<string, { done: number; total: number }>();
  for (const gm of globalMilestones) {
    const p = globalMilestoneProgress(
      gm.id,
      gm.links ?? [],
      projectMilestones,
      tasks,
      statuses
    );
    const existing = monthMap.get(gm.target_month) ?? { done: 0, total: 0 };
    monthMap.set(gm.target_month, {
      done: existing.done + p.done,
      total: existing.total + p.total,
    });
  }
  const barData = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { done, total }]) => ({
      month: formatMonth(month).slice(0, 3) + ' ' + month.slice(0, 4),
      percentage: total === 0 ? 0 : Math.round((done / total) * 100),
      done,
      total,
    }));

  // Blocker summary
  const blockedTasks = tasks.filter((t) => {
    const deps = t.task_dependencies ?? [];
    return deps.some((d) => d.type === 'blocked_by' && d.source_task_id === t.id);
  });

  // Milestone health cards
  const milestoneCards = globalMilestones.map((gm) => {
    const progress = globalMilestoneProgress(
      gm.id,
      gm.links ?? [],
      projectMilestones,
      tasks,
      statuses
    );
    const health = milestoneHealth(gm, progress);
    return { ...gm, progress, health };
  });

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top row: overall + per-month */}
      <div className="grid grid-cols-3 gap-6">
        {/* Overall donut */}
        <div className="rounded-lg border border-border bg-bg-secondary p-4 flex flex-col items-center">
          <span className="text-xs font-medium text-text-secondary mb-2">
            Overall Progress
          </span>
          <div className="relative">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={60}
                  dataKey="value"
                  stroke="none"
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-text-primary">
                {overallPct}%
              </span>
            </div>
          </div>
          <span className="text-xs text-text-muted mt-1">
            {totalDone}/{totalAll} tasks
          </span>
        </div>

        {/* Per-month bar chart */}
        <div className="col-span-2 rounded-lg border border-border bg-bg-secondary p-4">
          <span className="text-xs font-medium text-text-secondary mb-2 block">
            Monthly Progress
          </span>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={barData}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value) => [`${value}%`, 'Progress']}
              />
              <Bar
                dataKey="percentage"
                fill="#6366f1"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Milestone health cards */}
      <div>
        <h2 className="text-sm font-medium text-text-primary mb-3">
          Milestone Health
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {milestoneCards.map((card) => (
            <div
              key={card.id}
              className="rounded-lg border border-border bg-bg-secondary p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                {healthIcons[card.health]}
                <span className="text-sm font-medium text-text-primary">
                  {card.title}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${card.progress.percentage}%`,
                      backgroundColor: healthLabels[card.health].color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums" style={{ color: healthLabels[card.health].color }}>
                  {card.progress.percentage}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-text-muted">
                  {card.progress.done}/{card.progress.total} tasks
                </span>
                {card.deadline && (
                  <span className="text-[10px] text-text-muted">
                    {formatDate(card.deadline)}
                  </span>
                )}
                <span
                  className="text-[10px] font-medium"
                  style={{ color: healthLabels[card.health].color }}
                >
                  {healthLabels[card.health].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blocker summary */}
      <div>
        <h2 className="text-sm font-medium text-text-primary mb-3">
          Blockers ({blockedTasks.length})
        </h2>
        {blockedTasks.length === 0 ? (
          <p className="text-xs text-text-muted">No blocked tasks</p>
        ) : (
          <div className="space-y-1">
            {blockedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-2 rounded-lg px-3 py-2 bg-danger/5 border border-danger/10"
              >
                <span className="text-xs font-mono text-text-muted">
                  {task.identifier}
                </span>
                <span className="text-xs text-text-primary">{task.title}</span>
                <span className="ml-auto rounded px-1.5 py-0.5 text-[10px] font-medium bg-danger/10 text-danger">
                  blocked
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
