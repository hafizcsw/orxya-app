import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Loader2, Sparkles, X, Plus, List, Edit3, Split } from "lucide-react";
import { genIdem } from "@/lib/sync";
import { track } from "@/lib/telemetry";

interface AIAssistPanelProps {
  projectId: string;
  onClose: () => void;
  onTasksCreated?: () => void;
}

type Mode = "suggest_tasks" | "summarize_project" | "rewrite_title" | "split_subtasks";

export const AIAssistPanel = ({ projectId, onClose, onTasksCreated }: AIAssistPanelProps) => {
  const [mode, setMode] = useState<Mode | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runAI = async (selectedMode: Mode) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMode(selectedMode);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-assist", {
        body: { mode: selectedMode, project_id: projectId, prompt: prompt || undefined },
      });

      if (fnError) throw fnError;
      if (!data?.ok) {
        if (data?.error === "DAILY_CAP_REACHED") {
          throw new Error(`تم الوصول للسقف اليومي ($${data.cap}). حاول غدًا.`);
        }
        if (data?.error === "RATE_LIMIT_EXCEEDED") {
          throw new Error("تم تجاوز الحد المسموح. انتظر قليلاً.");
        }
        if (data?.error === "PAYMENT_REQUIRED") {
          throw new Error("يتطلب إضافة رصيد. راجع الإعدادات.");
        }
        throw new Error(data?.error || "فشل الطلب");
      }

      setResult(data.data);
      track(`ai_${selectedMode}`, { tokens: data.usage?.total_tokens });
    } catch (e: any) {
      console.error("AI assist error:", e);
      setError(e.message || "حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  const applyTasks = async () => {
    if (!result?.tasks) return;
    
    setLoading(true);
    try {
      let order = 1000;
      for (const task of result.tasks) {
        await supabase.functions.invoke("commands", {
          body: {
            command: "add_task",
            idempotency_key: genIdem(),
            payload: {
              project_id: projectId,
              title: task.title,
              status: task.status || "todo",
              due_date: task.due_date || null,
              tags: task.tags || [],
              order_pos: order,
            },
          },
        });
        order += 1000;
      }
      
      track("ai_tasks_applied", { count: result.tasks.length });
      onTasksCreated?.();
      onClose();
    } catch (e: any) {
      console.error("Apply tasks error:", e);
      setError("فشل إضافة المهام");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">مساعد الذكاء الاصطناعي</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Mode Selection */}
        {!mode && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => runAI("suggest_tasks")}
              disabled={loading}
            >
              <Plus className="w-6 h-6" />
              <div className="text-sm font-medium">اقتراح مهام</div>
              <div className="text-xs text-muted-foreground">3-5 مهام قابلة للتنفيذ</div>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4"
              onClick={() => runAI("summarize_project")}
              disabled={loading}
            >
              <List className="w-6 h-6" />
              <div className="text-sm font-medium">تلخيص المشروع</div>
              <div className="text-xs text-muted-foreground">ملخص + مخاطر + اختناقات</div>
            </Button>
          </div>
        )}

        {/* Prompt Input */}
        {!mode && (
          <div className="space-y-2">
            <label className="text-sm font-medium">تعليمات إضافية (اختياري)</label>
            <textarea
              className="w-full min-h-[80px] p-3 rounded-lg border bg-background resize-none"
              placeholder="مثال: ركّز على المهام التقنية..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-muted-foreground">جاري المعالجة...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive">
            {error}
          </div>
        )}

        {/* Results: Suggest Tasks */}
        {mode === "suggest_tasks" && result?.tasks && (
          <div className="space-y-3">
            <h3 className="font-semibold">المهام المقترحة:</h3>
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {result.tasks.map((task: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border bg-card space-y-1">
                  <div className="font-medium">{task.title}</div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-secondary">{task.status}</span>
                    {task.due_date && <span>📅 {task.due_date}</span>}
                    {task.tags?.length > 0 && (
                      <span>🏷️ {task.tags.join(", ")}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={applyTasks} disabled={loading} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                إضافة للكانبان ({result.tasks.length})
              </Button>
              <Button variant="outline" onClick={() => { setMode(null); setResult(null); }}>
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {/* Results: Summarize Project */}
        {mode === "summarize_project" && result && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-card space-y-2">
              <h3 className="font-semibold">📋 الملخص:</h3>
              <p className="text-sm">{result.summary}</p>
            </div>

            {result.risks?.length > 0 && (
              <div className="p-4 rounded-lg bg-card space-y-2">
                <h3 className="font-semibold">⚠️ المخاطر:</h3>
                <ul className="text-sm space-y-1">
                  {result.risks.map((r: string, i: number) => (
                    <li key={i}>• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.bottlenecks?.length > 0 && (
              <div className="p-4 rounded-lg bg-card space-y-2">
                <h3 className="font-semibold">🚧 نقاط الاختناق:</h3>
                <ul className="text-sm space-y-1">
                  {result.bottlenecks.map((b: string, i: number) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.next_action && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary">
                <h3 className="font-semibold mb-1">🎯 الإجراء التالي:</h3>
                <p className="text-sm">{result.next_action}</p>
              </div>
            )}

            <Button variant="outline" onClick={() => { setMode(null); setResult(null); }}>
              إغلاق
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
