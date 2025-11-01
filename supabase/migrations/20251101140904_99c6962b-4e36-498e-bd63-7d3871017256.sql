-- Enable pg_trgm extension for better text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add tags column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags text[];

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_owner_project 
  ON tasks(owner_id, project_id);

CREATE INDEX IF NOT EXISTS idx_tasks_project_status_order 
  ON tasks(project_id, status, order_pos);

CREATE INDEX IF NOT EXISTS idx_tasks_due 
  ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_tags_gin 
  ON tasks USING GIN (tags);

-- Add index for text search on title (using pg_trgm for fuzzy search)
CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm 
  ON tasks USING GIN (title gin_trgm_ops);