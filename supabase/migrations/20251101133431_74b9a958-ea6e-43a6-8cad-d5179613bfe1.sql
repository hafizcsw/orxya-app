-- Patch 13.3-Fix: ترقية order_pos + توحيد name + فهارس

-- 1) إعادة تسمية title إلى name في جدول projects
ALTER TABLE projects RENAME COLUMN title TO name;

-- 2) ترقية order_pos إلى numeric للدعم midpoint دقيق
ALTER TABLE tasks 
  ALTER COLUMN order_pos TYPE numeric USING order_pos::numeric;

-- 3) فهرس مركّب للفرز السريع داخل الأعمدة
CREATE INDEX IF NOT EXISTS idx_tasks_owner_proj_status_order
  ON tasks(owner_id, project_id, status, order_pos);