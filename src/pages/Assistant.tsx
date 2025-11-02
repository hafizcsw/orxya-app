import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Assistant() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<{role:'user'|'assistant', text:string}[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [consentOpen, setConsentOpen] = useState<{scopes:string[], message:string} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function send() {
    if (!text.trim()) return;
    const payload:any = { message: text.trim() };
    if (sessionId) payload.session_id = sessionId;

    setMsgs(m => [...m, { role:'user', text: text.trim() }]);
    setText("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("orchestrate-ai", { body: payload });
      if (error) throw error;

      if (data.reply) setMsgs(m => [...m, { role:'assistant', text: data.reply }]);
      setSessionId(data.session_id);

      const ask = (data.actions ?? []).find((a:any)=> a.type === "ask_consent");
      if (ask) setConsentOpen({ scopes: ask.payload.scopes, message: ask.payload.message });

      track("ai_orchestrate_ok");
    } catch (err) {
      setMsgs(m => [...m, { role:'assistant', text: "حدث خطأ أثناء المعالجة." }]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function grantScopes(scopes: string[]) {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;
    if (!uid) return;
    const rows = scopes.map(s => ({
      owner_id: uid, scope: s, granted: true, granted_at: new Date().toISOString(),
      expires_at: null, metadata: {}
    }));
    await supabase.from("ai_consent").upsert(rows);
    setConsentOpen(null);
    setMsgs(m => [...m, { role:'assistant', text: "تم منح الصلاحيات المطلوبة. أعِد طلبك لو سمحت." }]);
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="text-2xl font-semibold">المساعد الذكي</div>
      <div className="border rounded-xl p-3 space-y-3 bg-background min-h-[400px] max-h-[500px] overflow-y-auto">
        {msgs.map((m,i)=>(
          <div key={i} className={`p-2 rounded ${m.role==='user'?'bg-primary/10':'bg-muted'}`}>
            <div className="text-sm opacity-60">{m.role==='user'?'أنت':'المساعد'}</div>
            <div>{m.text}</div>
          </div>
        ))}
        {loading && <div className="text-sm opacity-70">... جاري التفكير</div>}
        <div ref={scrollRef} />
      </div>

      <div className="flex gap-2">
        <Input
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=> e.key==='Enter' && send()}
          placeholder="اكتب ما تريد أن يقوم به النظام…"
          className="flex-1"
        />
        <Button onClick={send} disabled={loading}>
          {loading ? '...' : 'إرسال'}
        </Button>
      </div>

      {consentOpen && (
        <div className="border rounded-xl p-4 space-y-3 bg-card">
          <div className="font-medium">الموافقة المطلوبة</div>
          <div className="text-sm text-muted-foreground">{consentOpen.message}</div>
          <div className="text-sm">الصلاحيات: {consentOpen.scopes.join(", ")}</div>
          <div className="flex gap-2">
            <Button onClick={()=>grantScopes(consentOpen.scopes)}>سماح</Button>
            <Button variant="outline" onClick={()=>setConsentOpen(null)}>إلغاء</Button>
          </div>
        </div>
      )}
    </div>
  );
}
