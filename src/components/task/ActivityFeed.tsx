'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { formatRelative } from '@/lib/utils/dates';
import type { ActivityLog, Profile } from '@/lib/types';

interface ActivityFeedProps {
  taskId: string;
}

type ActivityWithUser = ActivityLog & { user: Profile };

export function ActivityFeed({ taskId }: ActivityFeedProps) {
  const supabase = createClient();

  const { data: activities = [] } = useQuery({
    queryKey: ['activity', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*, user:profiles(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as ActivityWithUser[];
    },
    enabled: !!taskId,
  });

  const formatAction = (activity: ActivityWithUser) => {
    const name = activity.user?.name ?? 'Someone';
    switch (activity.action) {
      case 'created':
        return `${name} created this task`;
      case 'status_changed':
        return `${name} changed status from ${activity.old_value} to ${activity.new_value}`;
      case 'assignee_changed':
        return `${name} ${activity.new_value ? `assigned to ${activity.new_value}` : 'removed assignee'}`;
      case 'priority_changed':
        return `${name} changed priority from ${activity.old_value} to ${activity.new_value}`;
      case 'comment_added':
        return `${name} added a comment`;
      default:
        if (activity.field) {
          return `${name} changed ${activity.field}${activity.old_value ? ` from ${activity.old_value}` : ''}${activity.new_value ? ` to ${activity.new_value}` : ''}`;
        }
        return `${name} ${activity.action}`;
    }
  };

  return (
    <div>
      <span className="text-xs font-medium text-text-secondary mb-2 block">
        Activity
      </span>

      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-2">
            <div className="mt-1 h-1.5 w-1.5 rounded-full bg-text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-tertiary">
                {formatAction(activity)}
              </p>
              <span className="text-[10px] text-text-muted">
                {formatRelative(activity.created_at)}
              </span>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-xs text-text-muted">No activity yet</p>
        )}
      </div>
    </div>
  );
}
