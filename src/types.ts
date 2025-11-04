export type OryxaCommand =
  | 'add_daily_log'
  | 'add_finance'
  | 'add_sale'
  | 'set_alarm'
  | 'add_project'
  | 'add_task'
  | 'move_task'
  | 'set_task_status'

export interface PendingCommand {
  id?: number
  command: OryxaCommand
  idempotency_key: string
  payload: Record<string, any>
  created_at: number
}

// Event-related types
export type EventCategory = 
  | 'work' 
  | 'personal' 
  | 'meeting' 
  | 'task' 
  | 'study' 
  | 'exercise' 
  | 'food' 
  | 'travel'
  | 'prayer'
  | 'other';

export type EventPriority = 'high' | 'medium' | 'normal';

export type EventStatus = 'completed' | 'in_progress' | 'paused' | 'cancelled' | 'scheduled';
