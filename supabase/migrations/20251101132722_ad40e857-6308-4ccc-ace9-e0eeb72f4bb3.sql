-- Fix order_pos to support decimal values for midpoint ordering
ALTER TABLE public.tasks 
  ALTER COLUMN order_pos TYPE numeric USING order_pos::numeric;

-- Add composite index for better kanban performance
CREATE INDEX IF NOT EXISTS idx_tasks_owner_project_status_order
  ON public.tasks(owner_id, project_id, status, order_pos);