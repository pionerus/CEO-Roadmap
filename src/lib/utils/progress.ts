import type { Status, Task, ProjectMilestone, GlobalMilestone, GlobalMilestoneLink, Progress } from '@/lib/types';

export function calculateProgress(done: number, total: number): Progress {
  return {
    done,
    total,
    percentage: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export function taskIsDone(task: Task, statuses: Status[]): boolean {
  return statuses.find((s) => s.id === task.status_id)?.is_done ?? false;
}

export function milestoneProgress(
  milestoneId: string,
  tasks: Task[],
  statuses: Status[]
): Progress {
  const milestoneTasks = tasks.filter(
    (t) => t.project_milestone_id === milestoneId
  );
  const done = milestoneTasks.filter((t) => taskIsDone(t, statuses)).length;
  return calculateProgress(done, milestoneTasks.length);
}

export function globalMilestoneProgress(
  globalMilestoneId: string,
  links: GlobalMilestoneLink[],
  projectMilestones: ProjectMilestone[],
  tasks: Task[],
  statuses: Status[]
): Progress {
  const gmLinks = links.filter(
    (l) => l.global_milestone_id === globalMilestoneId
  );

  let totalDone = 0;
  let totalAll = 0;

  for (const link of gmLinks) {
    if (link.task_id) {
      const task = tasks.find((t) => t.id === link.task_id);
      if (task) {
        totalAll += 1;
        if (taskIsDone(task, statuses)) totalDone += 1;
      }
    } else if (link.project_milestone_id) {
      const p = milestoneProgress(link.project_milestone_id, tasks, statuses);
      totalDone += p.done;
      totalAll += p.total;
    } else if (link.project_id) {
      const projTasks = tasks.filter((t) => t.project_id === link.project_id);
      const done = projTasks.filter((t) => taskIsDone(t, statuses)).length;
      totalDone += done;
      totalAll += projTasks.length;
    }
  }

  // Also include project milestones linked via global_milestone_id field
  const linkedProjMilestones = projectMilestones.filter(
    (pm) => pm.global_milestone_id === globalMilestoneId
  );
  for (const pm of linkedProjMilestones) {
    // Avoid double-counting if already linked via global_milestone_links
    const alreadyLinked = gmLinks.some(
      (l) => l.project_milestone_id === pm.id
    );
    if (!alreadyLinked) {
      const p = milestoneProgress(pm.id, tasks, statuses);
      totalDone += p.done;
      totalAll += p.total;
    }
  }

  return calculateProgress(totalDone, totalAll);
}

export type MilestoneHealth = 'on_track' | 'at_risk' | 'behind';

export function milestoneHealth(
  gm: GlobalMilestone,
  progress: Progress
): MilestoneHealth {
  if (progress.total === 0) return 'on_track';

  const pctDone = progress.done / progress.total;
  const now = new Date();

  const [year, month] = gm.target_month.split('-').map(Number);
  const deadline = gm.deadline
    ? new Date(gm.deadline)
    : new Date(year, month, 0); // last day of month
  const start = new Date(year, month - 1, 1); // first day of month

  const totalTime = deadline.getTime() - start.getTime();
  if (totalTime <= 0) return pctDone >= 1 ? 'on_track' : 'behind';

  const elapsed = (now.getTime() - start.getTime()) / totalTime;

  if (pctDone >= elapsed) return 'on_track';
  if (pctDone >= elapsed * 0.5) return 'at_risk';
  return 'behind';
}
