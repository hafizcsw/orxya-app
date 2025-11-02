import { z } from "https://esm.sh/zod@3.23.8";

export const AiAction = z.object({
  type: z.enum([
    "create_task","move_task","set_alarm",
    "sync_prayers","conflict_check",
    "google_sync","create_event_local",
    "ask_consent","notify_local",
    "read_daily_report","update_daily_log",
    "add_transaction","update_balance"
  ]),
  payload: z.record(z.any())
});

export const AiPlan = z.object({
  assistant_reply: z.string().optional(),
  actions: z.array(AiAction).max(10).default([])
});

export type TAction = z.infer<typeof AiAction>;
export type TPlan = z.infer<typeof AiPlan>;

// صلاحيات لازمة لكل فعل
export const ActionScopes: Record<string, string[]> = {
  create_task: ["tasks_write"],
  move_task: ["tasks_write"],
  set_alarm: ["notifications"],
  sync_prayers: ["prayers_control"],
  conflict_check: [],
  google_sync: ["calendar_read"],
  create_event_local: ["calendar_read","tasks_write"],
  ask_consent: [],
  notify_local: ["notifications"],
  read_daily_report: [],
  update_daily_log: ["daily_logs_write"],
  add_transaction: ["transactions_write"],
  update_balance: ["balance_write"]
};
