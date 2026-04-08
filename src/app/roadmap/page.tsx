'use client';

import { Map } from 'lucide-react';

export default function RoadmapPage() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Map className="h-5 w-5 text-text-tertiary" />
          <h1 className="text-lg font-semibold text-text-primary">Roadmap</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-secondary">
            List
          </button>
          <button className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors">
            Dashboard
          </button>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Map className="mx-auto h-12 w-12 text-text-muted" />
          <h2 className="mt-4 text-lg font-medium text-text-primary">
            No milestones yet
          </h2>
          <p className="mt-1 text-sm text-text-tertiary">
            Create global milestones and link project items to build your roadmap.
          </p>
          <button className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors">
            Create Milestone
          </button>
        </div>
      </div>
    </div>
  );
}
