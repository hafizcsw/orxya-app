export type Project = {
  id: string;
  owner_id: string;
  name: string;
  status: 'Active' | 'Archived';
  priority?: string;
  target?: string;
  deadline?: string | null;
  next_action?: string;
  notes?: string;
  created_at: string;
};

export type Task = {
  id: string;
  owner_id: string;
  project_id: string;
  title: string;
  status: 'todo' | 'doing' | 'done';
  order_pos: number;
  due_date: string | null;
  created_at: string;
};
