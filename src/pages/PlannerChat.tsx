import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/lib/auth";
import { track } from "@/lib/telemetry";
import { throttle } from "@/lib/throttle";
import { Bot, Send, Sparkles, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-16 md:pb-0">
      {/* Header with gradient */}
      <div className="sticky top-0 z-10 backdrop-blur-lg bg-background/80 border-b">
        <div className="container max-w-4xl mx-auto p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/60">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                المخطِّط الذكي
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                يحترم أوقات الصلاة تلقائياً
              </div>
            </div>
          </div>
          <Button 
            onClick={newChat} 
            variant="outline" 
            size="sm"
            className="hover:bg-primary/10"
          >
            جديد
          </Button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="container max-w-4xl mx-auto">
        <main className="min-h-[calc(100vh-12rem)] p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                <Bot className="w-20 h-20 text-primary relative animate-pulse" />
              </div>
              <div>
                <div className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  مرحباً! كيف أساعدك اليوم؟
                </div>
                <div className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                  أنا هنا لمساعدتك في تنظيم يومك بذكاء
                </div>
              </div>
              
              {/* Example Cards */}
              <div className="grid gap-3 w-full max-w-md">
                {[
                  { icon: Calendar, text: "خطّط يومي بالكامل" },
                  { icon: Clock, text: "أنشئ حدث تمرين 45 دقيقة" },
                  { icon: Sparkles, text: "متى أقرب فترة فارغة؟" }
                ].map((item, i) => (
                  <Card
                    key={i}
                    className="p-4 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => setInput(item.text)}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                      <span className="text-sm">{item.text}</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              {messages.map((m, idx) => (
                <div 
                  key={m.id}
                  className={`flex gap-3 animate-in slide-in-from-bottom-2 duration-300`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {m.role === "assistant" && (
                    <div className="p-2 rounded-full bg-gradient-to-br from-primary to-primary/60 h-fit mt-1">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div className={`flex-1 rounded-2xl p-4 ${
                    m.role === "user" 
                      ? "bg-primary text-primary-foreground ml-12" 
                      : m.role === "assistant"
                      ? "bg-muted mr-12"
                      : "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm"
                  }`}>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {renderMsg(m)}
                    </div>
                  </div>
                  {m.role === "user" && (
                    <div className="p-2 rounded-full bg-primary/10 h-fit mt-1">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        {/* Input Area */}
        <div className="sticky bottom-0 p-4 bg-gradient-to-t from-background via-background to-transparent">
          <Card className="p-2 shadow-lg">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="اكتب طلبك هنا..."
                className="flex-1 min-h-[52px] max-h-40 p-3 bg-transparent border-0 outline-none resize-none placeholder:text-muted-foreground/60"
              />
              <Button
                onClick={send}
                disabled={sending || !input.trim()}
                size="lg"
                className="rounded-xl px-6 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {sending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  </div>
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </Card>
        </div>
      </div>
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
