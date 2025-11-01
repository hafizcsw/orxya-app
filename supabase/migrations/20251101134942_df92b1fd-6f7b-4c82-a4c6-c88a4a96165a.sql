-- Patch 13.5: Performance indexes for kanban operations

-- Composite index for fast filtering and sorting
CREATE INDEX IF NOT EXISTS idx_tasks_order
  ON tasks(owner_id, project_id, status, order_pos);

-- Index for project-level queries
CREATE INDEX IF NOT EXISTS idx_tasks_project
  ON tasks(owner_id, project_id);

-- Index for owner-level project queries
CREATE INDEX IF NOT EXISTS idx_projects_owner
  ON projects(owner_id);

-- Add status constraint for data integrity (skip if exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_status_chk'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_status_chk
      CHECK (status IN ('todo', 'doing', 'done'));
  END IF;
END $$;