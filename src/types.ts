export type OryxaCommand =
  | 'add_daily_log'
  | 'add_finance'
  | 'add_sale'
  | 'set_alarm'

export interface PendingCommand {
  id?: number
  command: OryxaCommand
  idempotency_key: string
  payload: Record<string, any>
  created_at: number
}
