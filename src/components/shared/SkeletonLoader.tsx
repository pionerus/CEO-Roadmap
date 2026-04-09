'use client';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-bg-tertiary ${className}`}
    />
  );
}

export function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Skeleton className="h-3.5 w-3.5" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-2.5 w-2.5 rounded-full" />
      <Skeleton className="h-3 w-48" />
      <div className="flex-1" />
      <Skeleton className="h-5 w-5 rounded-full" />
    </div>
  );
}

export function MilestoneSkeleton() {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 py-2">
        <Skeleton className="h-3.5 w-3.5" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-1 w-24" />
      </div>
      <div className="ml-6">
        <TaskRowSkeleton />
        <TaskRowSkeleton />
        <TaskRowSkeleton />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <MilestoneSkeleton />
      <MilestoneSkeleton />
    </div>
  );
}
