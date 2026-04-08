'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { useCreateProject } from '@/lib/hooks/useProjects';
import { useRouter } from 'next/navigation';

const PROJECT_COLORS = [
  '#6366f1',
  '#ec4899',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#06b6d4',
];

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectDialog({
  open,
  onClose,
}: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [description, setDescription] = useState('');
  const createProject = useCreateProject();
  const router = useRouter();

  const handleNameChange = (val: string) => {
    setName(val);
    // Auto-generate prefix from name
    if (!prefix || prefix === generatePrefix(name)) {
      setPrefix(generatePrefix(val));
    }
  };

  const handleSubmit = async () => {
    if (!name || !prefix) return;
    const project = await createProject.mutateAsync({
      name,
      prefix: prefix.toUpperCase(),
      color,
      description: description || undefined,
    });
    onClose();
    setName('');
    setPrefix('');
    setColor(PROJECT_COLORS[0]);
    setDescription('');
    router.push(`/project/${project.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Product"
            autoFocus
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Prefix
          </label>
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            placeholder="e.g. PROD"
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <p className="mt-1 text-xs text-text-muted">
            Used in task IDs like {prefix || 'PROD'}-1
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Color
          </label>
          <div className="flex gap-2">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
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
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name || !prefix || createProject.isPending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {createProject.isPending ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function generatePrefix(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map((w) => w.substring(0, 4))
    .join('')
    .toUpperCase()
    .substring(0, 6);
}
