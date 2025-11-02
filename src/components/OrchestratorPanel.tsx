import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { Brain, Calendar, Sparkles, CheckCircle } from "lucide-react";

type Plan = {
  tasks?: Array<{ title: string; status: string; due_date?: string; estimate_min?: number }>;
  events?: Array<{ title: string; starts_at: string; ends_at: string; is_all_day?: boolean }>;
  questions?: string[];
  assistant_reply?: string;
};

export function OrchestratorPanel() {
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function requestPlan(intent: string) {
    setBusy(true);
    track("orchestrator_plan_request", { intent });

    try {
      const dateISO = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.functions.invoke("ai-orchestrate", {
        body: { intent, date: dateISO }
      });

      if (error) throw error;

      if (data?.ok && data.plan) {
        setPlan(data.plan);
        setSessionId(data.session_id);
        track("orchestrator_plan_received", { intent, has_tasks: !!data.plan.tasks?.length });
      } else {
        throw new Error(data?.error || "خطأ في الاستجابة");
      }
    } catch (e: any) {
      console.error("Orchestrator error:", e);
      track("orchestrator_plan_error", { intent, error: e.message });
      alert(`خطأ: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function approvePlan() {
    if (!plan) return;

    setBusy(true);
    track("orchestrator_plan_approve", { session_id: sessionId });

    try {
      // Create tasks
      if (plan.tasks && plan.tasks.length > 0) {
        for (const task of plan.tasks) {
          await supabase.functions.invoke("commands", {
            body: {
              command: "create_task",
              payload: {
                title: task.title,
                status: task.status || "todo",
                due_date: task.due_date
              }
            }
          });
        }
      }

      // Create events
      if (plan.events && plan.events.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          for (const event of plan.events) {
            await supabase.from("events").insert({
              owner_id: user.id,
              title: event.title,
              starts_at: event.starts_at,
              ends_at: event.ends_at,
              is_all_day: event.is_all_day || false,
              source: "ai",
              ai_confidence: 0.8
            });
          }
        }
      }

      // Run conflict check
      const today = new Date().toISOString().slice(0, 10);
      await supabase.functions.invoke("conflict-check", { body: { date: today } });

      track("orchestrator_plan_applied", { 
        tasks: plan.tasks?.length ?? 0,
        events: plan.events?.length ?? 0
      });

      alert("✅ تم تطبيق الخطة بنجاح!");
      setPlan(null);
    } catch (e: any) {
      console.error("Apply plan error:", e);
      track("orchestrator_apply_error", { error: e.message });
      alert(`خطأ في التطبيق: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border p-4 bg-white/70 space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-6 h-6 text-purple-600" />
        <h2 className="text-lg font-semibold">المخطط الذكي</h2>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => requestPlan("plan_today")}
          disabled={busy}
          className="btn flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Calendar className="w-4 h-4" />
          خطة اليوم
        </button>

        <button
          onClick={() => requestPlan("plan_tomorrow")}
          disabled={busy}
          className="btn flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          خطة الغد
        </button>

        <button
          onClick={() => requestPlan("plan_week")}
          disabled={busy}
          className="btn flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Calendar className="w-4 h-4" />
          خطة الأسبوع
        </button>

        <button
          onClick={() => requestPlan("fill_gaps")}
          disabled={busy}
          className="btn flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          سد النواقص
        </button>
      </div>

      {/* Plan Preview */}
      {plan && (
        <div className="mt-4 p-4 rounded-xl border bg-white space-y-3">
          <div className="font-semibold text-purple-700">الخطة المقترحة:</div>

          {plan.assistant_reply && (
            <div className="text-sm text-muted-foreground p-3 bg-purple-50 rounded-lg">
              {plan.assistant_reply}
            </div>
          )}

          {plan.tasks && plan.tasks.length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2">المهام ({plan.tasks.length}):</div>
              <ul className="text-sm space-y-1">
                {plan.tasks.map((task, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 text-green-600" />
                    <span>{task.title}</span>
                    {task.estimate_min && (
                      <span className="text-xs text-muted-foreground">({task.estimate_min} د)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.events && plan.events.length > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2">الأحداث ({plan.events.length}):</div>
              <ul className="text-sm space-y-1">
                {plan.events.map((event, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 text-blue-600" />
                    <div>
                      <div>{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.starts_at).toLocaleTimeString("ar-EG", { 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                        {" - "}
                        {new Date(event.ends_at).toLocaleTimeString("ar-EG", { 
                          hour: "2-digit", 
                          minute: "2-digit" 
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {plan.questions && plan.questions.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-semibold text-yellow-900 mb-2">أسئلة ناقصة:</div>
              <ul className="text-sm text-yellow-800 space-y-1">
                {plan.questions.map((q, i) => (
                  <li key={i}>• {q}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={approvePlan}
              disabled={busy || (plan.questions && plan.questions.length > 0)}
              className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white disabled:opacity-50"
            >
              اعتماد الخطة ✅
            </button>
            <button
              onClick={() => setPlan(null)}
              className="px-4 py-2 rounded-lg border"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {busy && (
        <div className="text-center text-sm text-muted-foreground">
          جاري المعالجة...
        </div>
      )}
    </div>
  );
}
