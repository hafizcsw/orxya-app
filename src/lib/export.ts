import type { Project, Task } from '@/types/project';

export function exportProjectsToJSON(projects: Project[], tasks: Task[]) {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    projects: projects.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      priority: p.priority,
      target: p.target,
      deadline: p.deadline,
      next_action: p.next_action,
      notes: p.notes,
      created_at: p.created_at,
      tasks: tasks.filter(t => t.project_id === p.id).map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        order_pos: t.order_pos,
        due_date: t.due_date,
        tags: t.tags,
        created_at: t.created_at,
        updated_at: t.updated_at
      }))
    }))
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `oryxa-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleProjectToJSON(project: Project, tasks: Task[]) {
  const exportData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      target: project.target,
      deadline: project.deadline,
      next_action: project.next_action,
      notes: project.notes,
      created_at: project.created_at,
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        order_pos: t.order_pos,
        due_date: t.due_date,
        tags: t.tags,
        created_at: t.created_at,
        updated_at: t.updated_at
      }))
    }
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${project.name}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
