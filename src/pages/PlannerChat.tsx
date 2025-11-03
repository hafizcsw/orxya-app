import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { track } from "@/lib/telemetry";
import { throttle } from "@/lib/throttle";
import { Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";

type AgentMsg = {
  id: string;
  role: "user" | "assistant" | "tool";
  content: any;
  created_at: string;
};

export default function PlannerChat() {
  const { user } = useUser();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [subscribed, setSubscribed] = useState(false);

  const key = useMemo(() => (user?.id ? `planner_thread_${user.id}` : ""), [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      // Feature flag gate
      const { data } = await supabase.from("feature_flags")
        .select("key,enabled,pilot_user_ids").in("key", ["agent.planner_enabled"]);
      const flag = data?.[0];
      const pilots: string[] = Array.isArray(flag?.pilot_user_ids) ? flag.pilot_user_ids : [];
      const flagOn = flag?.enabled === true;
      setEnabled(flagOn || pilots.includes(user.id));

      if (!(flagOn || pilots.includes(user.id))) return;

      // Ensure thread
      let tid = localStorage.getItem(key);
      if (!tid) {
        const { data: t, error } = await supabase
          .from("agent_threads")
          .insert({ owner_id: user.id, kind: "planner", title: "مخطّط اليوم" })
          .select("id").single();
        if (error) { console.error(error); return; }
        tid = t?.id ?? null;
        if (tid) localStorage.setItem(key, tid);
      }
      setThreadId(tid ?? null);
    })();
  }, [user?.id, key]);

  const loadMessages = async (tid: string) => {
    const { data, error } = await supabase
      .from("agent_messages")
      .select("id,role,content,created_at")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true })
      .limit(500);
    if (!error) setMessages((data ?? []) as AgentMsg[]);
  };

  const reloadMessages = useMemo(
    () => throttle((tid: string) => loadMessages(tid), 300),
    []
  );

  useEffect(() => {
    if (!threadId) return;
    loadMessages(threadId);
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!threadId || subscribed) return;
    const ch = supabase.channel(`agent_thread_${threadId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "agent_messages",
        filter: `thread_id=eq.${threadId}`
      }, () => reloadMessages(threadId))
      .subscribe(status => {
        if (status === "SUBSCRIBED") setSubscribed(true);
      });
    return () => { supabase.removeChannel(ch); setSubscribed(false); };
  }, [threadId, subscribed, reloadMessages]);

  async function send() {
    const text = input.trim();
    if (!text || !threadId || sending) return;
    setSending(true);

    const tmp: AgentMsg = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: { text },
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tmp]);
    setInput("");
    track("agent_msg_user");

    try {
      const { data, error } = await supabase.functions.invoke("planner-agent", {
        body: { thread_id: threadId, message: text }
      });
      if (error) throw error;

      await loadMessages(threadId);
      track("agent_msg_assistant");
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.filter(m => m.id !== tmp.id));
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: { text: "تعذّر الإرسال حاليًا. تحقّق من الاتصال ثم أعد المحاولة." },
        created_at: new Date().toISOString()
      }]);
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function newChat() {
    if (!user?.id) return;
    localStorage.removeItem(key);
    setThreadId(null);
    setMessages([]);
    track("planner_new_chat");
    window.location.reload();
  }

  if (enabled === null) return <div className="p-6">جارٍ التحميل...</div>;
  if (enabled === false) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <h2 className="text-xl font-semibold mb-2">المخطِّط الذكي</h2>
        <p className="text-muted-foreground">هذه الميزة غير مفعّلة لحسابك بعد.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col pb-16 md:pb-0">
      <header className="p-4 border-b flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5" />
            المخطِّط الذكي (Beta)
          </div>
          <div className="text-sm text-muted-foreground">يُحترم وقت الصلاة وDND تلقائيًا</div>
        </div>
        <Button onClick={newChat} variant="outline" size="sm">
          محادثة جديدة
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Bot className="w-16 h-16 text-primary opacity-50" />
            <div>
              <div className="text-lg font-medium mb-2">مرحبًا! كيف يمكنني مساعدتك اليوم؟</div>
              <div className="text-sm text-muted-foreground max-w-md mx-auto">
                جرّب أسئلة مثل:
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="p-2 bg-secondary rounded-lg">• "خطّط يومي"</div>
                <div className="p-2 bg-secondary rounded-lg">• "أنشئ حدث تمرين مدته 45 دقيقة عصرًا"</div>
                <div className="p-2 bg-secondary rounded-lg">• "متى أقرب فترة فارغة؟"</div>
              </div>
            </div>
          </div>
        ) : (
          messages.map(m => (
            <div key={m.id} className={`max-w-[80%] rounded-2xl p-3 whitespace-pre-wrap leading-7
              ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" :
                 m.role === "assistant" ? "bg-muted" : "bg-amber-50 border border-amber-200 text-sm"}`}>
              {renderMsg(m)}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </main>

      <footer className="p-4 border-t">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="اكتب ما تريد تنظيمه اليوم… مثل: 'رتّب تمرين 45 دقيقة بعد العصر وذكّرني قبل 15 دقيقة'"
            className="flex-1 min-h-[48px] max-h-40 p-3 rounded-xl border bg-background resize-none"
          />
          <Button
            onClick={send}
            disabled={sending || !input.trim()}
            size="lg"
            className="px-6"
          >
            {sending ? "جارٍ…" : <Send className="w-5 h-5" />}
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          ↩︎ Enter للإرسال • Shift+Enter لسطر جديد
        </div>
      </footer>
    </div>
  );
}

function renderMsg(m: AgentMsg) {
  if (m.role === "tool") {
    const c = m.content || {};
    return (
      <div className="text-xs">
        🛠️ {c.tool_name}
        <div className="opacity-70 mt-1">args: {safeStr(c.tool_args)}</div>
        <div className="opacity-70">result: {safeStr(c.tool_result)}</div>
      </div>
    );
  }
  const t = m?.content?.text ?? "";
  return <span>{t}</span>;
}

function safeStr(v: any) {
  try { return JSON.stringify(v); } catch { return String(v); }
}
