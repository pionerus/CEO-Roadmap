'use client';

import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Download, Trash2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/layout/AuthGuard';
import type { Attachment } from '@/lib/types';

interface AttachmentListProps {
  taskId: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentList({ taskId }: AttachmentListProps) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!taskId,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const path = `tasks/${taskId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(path, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('attachments').getPublicUrl(path);

      const { error: dbError } = await supabase.from('attachments').insert({
        task_id: taskId,
        filename: file.name,
        file_url: publicUrl,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        uploaded_by: user!.id,
      });
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (attachment: Attachment) => {
      // Extract storage path from URL
      const urlParts = attachment.file_url.split('/attachments/');
      if (urlParts.length > 1) {
        await supabase.storage
          .from('attachments')
          .remove([urlParts[1]]);
      }
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', taskId] });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      upload.mutate(file);
    }
    e.target.value = '';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary">
          Attachments
        </span>
        {user?.role === 'admin' && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-text-muted hover:text-accent transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="space-y-1">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-bg-tertiary transition-colors"
          >
            <Paperclip className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
            <span className="flex-1 text-xs text-text-primary truncate">
              {att.filename}
            </span>
            <span className="text-[10px] text-text-muted">
              {formatFileSize(att.file_size)}
            </span>
            <a
              href={att.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-accent transition-colors"
            >
              <Download className="h-3 w-3" />
            </a>
            {user?.role === 'admin' && (
              <button
                onClick={() => remove.mutate(att)}
                className="hidden text-text-muted hover:text-danger group-hover:block transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {attachments.length === 0 && (
          <p className="text-xs text-text-muted">No attachments</p>
        )}
      </div>

      {upload.isPending && (
        <p className="mt-1 text-xs text-accent">Uploading...</p>
      )}
    </div>
  );
}
