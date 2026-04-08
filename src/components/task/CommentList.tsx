'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/layout/AuthGuard';
import { formatRelative } from '@/lib/utils/dates';
import type { Comment, Profile } from '@/lib/types';

interface CommentListProps {
  taskId: string;
}

type CommentWithAuthor = Comment & { author: Profile };

export function CommentList({ taskId }: CommentListProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [body, setBody] = useState('');

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, author:profiles(*)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as CommentWithAuthor[];
    },
    enabled: !!taskId,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!body.trim() || !user) return;
      const { error } = await supabase.from('comments').insert({
        task_id: taskId,
        author_id: user.id,
        body: body.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setBody('');
    },
  });

  return (
    <div>
      <span className="text-xs font-medium text-text-secondary mb-2 block">
        Comments
      </span>

      <div className="space-y-3 mb-3">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-[10px] font-medium text-accent flex-shrink-0 mt-0.5">
              {comment.author?.name?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-text-primary">
                  {comment.author?.name}
                </span>
                <span className="text-[10px] text-text-muted">
                  {formatRelative(comment.created_at)}
                </span>
              </div>
              <p className="text-sm text-text-secondary mt-0.5 whitespace-pre-wrap">
                {comment.body}
              </p>
            </div>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="text-xs text-text-muted">No comments yet</p>
        )}
      </div>

      {user?.role === 'admin' && (
        <div className="flex items-center gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && body.trim()) {
                e.preventDefault();
                addComment.mutate();
              }
            }}
            placeholder="Add a comment..."
            className="flex-1 rounded-lg border border-border bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => addComment.mutate()}
            disabled={!body.trim() || addComment.isPending}
            className="rounded-lg bg-accent p-1.5 text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
