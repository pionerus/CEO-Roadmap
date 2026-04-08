'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { useCreateGlobalMilestone } from '@/lib/hooks/useGlobalRoadmap';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateGlobalMilestoneDialog({ open, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [targetMonth, setTargetMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateGlobalMilestone();

  const handleSubmit = async () => {
    if (!title) return;
    await create.mutateAsync({
      title,
      target_month: targetMonth,
      deadline: deadline || undefined,
      description: description || undefined,
      order: 0,
    } as any);
    onClose();
    setTitle('');
    setDeadline('');
    setDescription('');
  };

  return (
    <Modal open={open} onClose={onClose} title="New Global Milestone">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Mocked MVP"
            autoFocus
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
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
              Deadline (optional)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
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
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title || create.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}
