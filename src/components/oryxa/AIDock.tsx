import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomNav } from "@/components/BottomNav";
import { askAgentHub, type AgentResponse, type ActionResult } from "@/lib/agent-hub";

interface Message {
  role: "user" | "assistant";
  content: string;
  actions?: ActionResult[];
  tips?: string[];
}

export function AIDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "مرحباً! أنا مساعدك الذكي في Oryxa. كيف يمكنني مساعدتك اليوم؟" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: message };
    setMessages(prev => [...prev, userMsg]);
    setMessage("");
    setIsLoading(true);

    try {
      const response: AgentResponse = await askAgentHub(message);
      
      if (response.ok && response.assistant_message) {
        const assistantMsg: Message = {
          role: "assistant",
          content: response.assistant_message,
          actions: response.applied_actions,
          tips: response.tips,
        };
        setMessages(prev => [...prev, assistantMsg]);
      } else {
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: response.error || "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى." 
        }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Bottom Navigation with AI Button */}
      <BottomNav onAIClick={() => setIsOpen(!isOpen)} />

      {/* AI Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-end p-6">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative w-full max-w-md h-[600px] bg-card rounded-3xl border border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold text-xl text-primary-foreground"
                  style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
                >
                  AI
                </div>
                <div>
                  <h3 className="font-semibold">Oryxa AI</h3>
                  <p className="text-xs text-muted-foreground">المساعد الذكي</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className="space-y-2">
                  <div
                    className={cn(
                      "rounded-2xl p-4 max-w-[85%]",
                      msg.role === "assistant"
                        ? "bg-secondary/50 mr-auto"
                        : "bg-[hsl(var(--whoop-blue)_/_0.15)] ml-auto border border-[hsl(var(--whoop-blue)_/_0.3)]"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  
                  {/* Display Actions */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="space-y-1 max-w-[85%] mr-auto">
                      {msg.actions.map((act, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg text-xs",
                            act.error
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {act.error ? (
                            <XCircle className="w-3 h-3 flex-shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          )}
                          <span>
                            {act.error 
                              ? `فشل: ${act.action.type}` 
                              : `✓ ${getActionLabel(act.action.type)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Display Tips */}
                  {msg.tips && msg.tips.length > 0 && (
                    <div className="space-y-1 max-w-[85%] mr-auto">
                      {msg.tips.map((tip, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-lg text-xs bg-accent/10 text-accent-foreground"
                        >
                          <Sparkles className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="bg-secondary/50 rounded-2xl p-4 max-w-[85%] mr-auto flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">يعمل...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="اكتب رسالتك..."
                  disabled={isLoading}
                  className="flex-1 bg-secondary rounded-full px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || isLoading}
                  className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ boxShadow: "var(--glow-blue)" }}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function getActionLabel(type: string): string {
  const labels: Record<string, string> = {
    connect_google: "ربط Google",
    sync_gcal: "مزامنة التقويم",
    location_update: "تحديث الموقع",
    prayer_sync: "مزامنة الصلاة",
    conflict_check: "فحص التعارضات",
    create_task: "إنشاء مهمة",
    move_task: "نقل مهمة",
    create_event: "إنشاء حدث",
    reschedule_event: "إعادة جدولة",
    set_alarm: "تعيين منبه",
    read_daily_report: "قراءة التقرير",
    update_daily_log: "تحديث السجل",
    add_transaction: "إضافة معاملة",
    update_balance: "تحديث الرصيد",
  };
  return labels[type] || type;
}
