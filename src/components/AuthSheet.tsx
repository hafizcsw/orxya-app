import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { identifyUser, track } from "@/lib/telemetry";

export default function AuthSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"idle"|"sent"|"verifying">("idle");
  const [msg, setMsg] = useState<string|null>(null);
  
  if (!open) return null;

  async function sendMagicLink() {
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin }
    });
    if (error) { 
      setMsg("تعذّر الإرسال: " + error.message); 
      return; 
    }
    setPhase("sent"); 
    setMsg("تم إرسال رابط/رمز إلى بريدك ✉️");
    track("auth_magiclink_sent", { email });
  }

  async function verifyOtp() {
    setMsg(null); 
    setPhase("verifying");
    const { data, error } = await supabase.auth.verifyOtp({ 
      type: "email", 
      email, 
      token: code 
    });
    if (error) { 
      setMsg("رمز غير صحيح: " + error.message); 
      setPhase("sent"); 
      return; 
    }
    identifyUser(data?.user?.id ?? null, data?.user ? { email: data.user.email } : undefined);
    track("auth_otp_verified", { ok: !!data?.user?.id });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end">
      <div className="w-full bg-background rounded-t-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">تسجيل الدخول</h2>
          <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors" onClick={onClose}>
            إغلاق
          </button>
        </div>

        <label className="block text-sm">البريد الإلكتروني</label>
        <input 
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
          type="email" 
          dir="ltr" 
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
          placeholder="you@example.com" 
        />

        <div className="flex gap-2">
          <button 
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
            onClick={sendMagicLink} 
            disabled={!email}
          >
            إرسال رابط/رمز
          </button>
        </div>

        {phase !== "idle" && (
          <div className="space-y-2">
            <label className="block text-sm">رمز التحقق (اختياري إذا وصلتك أرقام)</label>
            <input 
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground" 
              inputMode="numeric" 
              dir="ltr" 
              value={code} 
              onChange={e=>setCode(e.target.value)} 
              placeholder="123456" 
            />
            <button 
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50" 
              onClick={verifyOtp} 
              disabled={!email || !code || phase==="verifying"}
            >
              {phase==="verifying" ? "جارِ التحقق..." : "تحقق من الرمز"}
            </button>
          </div>
        )}

        {msg && <div className="text-sm text-muted-foreground">{msg}</div>}
      </div>
    </div>
  );
}
