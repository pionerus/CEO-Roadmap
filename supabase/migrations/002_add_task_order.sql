-- Add order column to tasks for drag-to-reorder
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS "order" INT NOT NULL DEFAULT 0;

-- Initialize order based on created_at
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as rn
  FROM public.tasks
)
UPDATE public.tasks t SET "order" = r.rn FROM ranked r WHERE t.id = r.id;

CREATE INDEX IF NOT EXISTS idx_tasks_order ON public.tasks("order");
