import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "ai_session_id";

export async function ensureAISession(): Promise<string|null> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess?.session?.user?.id;
  if (!uid) return null;

  let id = localStorage.getItem(LS_KEY);
  if (id) {
    const { data } = await supabase.from("ai_sessions").select("id").eq("id", id).maybeSingle();
    if (data?.id) return id;
    localStorage.removeItem(LS_KEY);
  }

  const { data: last } = await supabase
    .from("ai_sessions").select("id").eq("owner_id", uid)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last?.id) { localStorage.setItem(LS_KEY, last.id); return last.id; }

  const ins = await supabase.from("ai_sessions")
    .insert({ owner_id: uid })
    .select("id").single();
  if (ins.error) return null;
  localStorage.setItem(LS_KEY, ins.data.id);
  return ins.data.id;
}

export async function getAIConsents() {
  const sid = await ensureAISession();
  if (!sid) return null;
  const { data } = await supabase
    .from("ai_sessions")
    .select("id,consent_read_calendar,consent_write_calendar,consent_write_tasks")
    .eq("id", sid).maybeSingle();
  return data ?? null;
}

export async function updateAIConsents(flags: {
  consent_read_calendar?: boolean;
  consent_write_calendar?: boolean;
  consent_write_tasks?: boolean;
}) {
  const sid = await ensureAISession();
  if (!sid) return { ok:false };
  const { error } = await supabase.from("ai_sessions").update(flags).eq("id", sid);
  return { ok: !error };
}

export async function aiAsk(message: string, opts?: { context_project_id?: string }) {
  const sid = await ensureAISession();
  if (!sid) return { ok:false, error:"NO_SESSION" };
  const { data, error } = await supabase.functions.invoke("ai-orchestrate", {
    body: { session_id: sid, message, ...(opts?.context_project_id ? { context_project_id: opts.context_project_id } : {}) }
  });
  if (error || !data?.ok) return { ok:false, error: error?.message || data?.error || "AI_ERROR" };
  return { ok:true, reply: data.reply, raw: data.raw };
}

export type AIConsents = {
  id?: string;
  consent_read_calendar: boolean;
  consent_write_calendar: boolean;
  consent_write_tasks: boolean;
};

export function computeAIStatus(c: AIConsents | null): "off" | "limited" | "on" {
  if (!c) return "off";
  const anyWrite = !!(c.consent_write_tasks || c.consent_write_calendar);
  const allOff = !c.consent_read_calendar && !anyWrite;
  if (allOff) return "off";
  if (anyWrite) return "on";
  return "limited";
}

export async function setAIConsentsPreset(preset: "all_on" | "all_off") {
  const flags =
    preset === "all_on"
      ? {
          consent_read_calendar: true,
          consent_write_calendar: true,
          consent_write_tasks: true,
        }
      : {
          consent_read_calendar: false,
          consent_write_calendar: false,
          consent_write_tasks: false,
        };
  return updateAIConsents(flags);
}

