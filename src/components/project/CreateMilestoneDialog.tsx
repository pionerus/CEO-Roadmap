'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { useCreateMilestone } from '@/lib/hooks/useMilestones';

interface CreateMilestoneDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CreateMilestoneDialog({
  open,
  onClose,
  projectId,
}: CreateMilestoneDialogProps) {
  const [title, setTitle] = useState('');
  const [targetMonth, setTargetMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [description, setDescription] = useState('');
  const createMilestone = useCreateMilestone();

  const handleSubmit = async () => {
    if (!title) return;
    await createMilestone.mutateAsync({
      project_id: projectId,
      title,
      target_month: targetMonth,
      description: description || undefined,
      order: 0,
    } as any);
    onClose();
    setTitle('');
    setDescription('');
  };

  return (
    <Modal open={open} onClose={onClose} title="New Milestone">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. April — Mocked MVP"
            autoFocus
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Target Month
          </label>
          <input
            type="month"
            value={targetMonth}
            onChange={(e) => setTargetMonth(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || createMilestone.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}
