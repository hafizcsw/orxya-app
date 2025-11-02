import { useState } from "react";
import { Send, Sparkles, Calendar, CheckSquare, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OryxaButton } from "./Button";
import { OryxaCard, OryxaCardContent, OryxaCardHeader, OryxaCardTitle } from "./Card";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  id: string;
  label: string;
  icon: any;
  mode: 'plan_my_day' | 'triage_conflicts' | 'task_extractor' | 'agenda_brief' | 'prayer_guard';
}

const quickActions: QuickAction[] = [
  { id: 'plan', label: 'خطط يومي', icon: Calendar, mode: 'plan_my_day' },
  { id: 'conflicts', label: 'راجع التعارضات', icon: Clock, mode: 'triage_conflicts' },
  { id: 'agenda', label: 'ملخص اليوم', icon: CheckSquare, mode: 'agenda_brief' },
  { id: 'prayer', label: 'حماية الصلاة', icon: Sparkles, mode: 'prayer_guard' },
];

export function AIDock() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string, mode: string = 'chat') => {
    if (!content.trim() && mode === 'chat') return;

    const userMessage: Message = {
      role: 'user',
      content: content || mode,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
        body: { mode, message: content }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI error:', error);
      toast.error('فشل الاتصال بالمساعد الذكي');
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setIsOpen(true);
    sendMessage(action.label, action.mode);
  };

  return (
    <>
      {/* Dock Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-[var(--z-fixed)]">
          <OryxaButton
            size="lg"
            onClick={() => setIsOpen(true)}
            className="rounded-full shadow-glow h-14 w-14 p-0"
          >
            <Sparkles className="h-6 w-6" />
          </OryxaButton>
        </div>
      )}

      {/* Dock Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[var(--z-modal)] w-96 max-h-[600px] animate-scale-in">
          <OryxaCard variant="glass" className="flex flex-col h-full">
            <OryxaCardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[hsl(var(--brand-500))]" />
                <OryxaCardTitle className="text-lg">المساعد الذكي</OryxaCardTitle>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[hsl(var(--text-muted))] hover:text-[hsl(var(--text))] transition-colors"
              >
                ✕
              </button>
            </OryxaCardHeader>

            <OryxaCardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Quick Actions */}
              {messages.length === 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map(action => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleQuickAction(action)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 rounded-button",
                          "bg-[hsl(var(--surface-raised))] hover:bg-[hsl(var(--muted))]",
                          "border border-[hsl(var(--border))] transition-all duration-base",
                          "hover:shadow-soft"
                        )}
                      >
                        <Icon className="h-5 w-5 text-[hsl(var(--brand-500))]" />
                        <span className="text-xs text-[hsl(var(--text))]">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-3 rounded-button text-sm",
                      msg.role === 'user'
                        ? "bg-[hsl(var(--brand-500))] text-white mr-8"
                        : "bg-[hsl(var(--surface-raised))] text-[hsl(var(--text))] ml-8"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className="text-xs opacity-60 mt-1">
                      {msg.timestamp.toLocaleTimeString('ar-EG', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-[hsl(var(--text-muted))] ml-8">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">يفكر...</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage(input)}
                  placeholder="اكتب رسالتك..."
                  disabled={loading}
                  className={cn(
                    "flex-1 px-4 py-2 rounded-pill",
                    "bg-[hsl(var(--surface-raised))] border border-[hsl(var(--border))]",
                    "text-[hsl(var(--text))] placeholder:text-[hsl(var(--text-muted))]",
                    "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-500))]",
                    "disabled:opacity-50"
                  )}
                />
                <OryxaButton
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </OryxaButton>
              </div>
            </OryxaCardContent>
          </OryxaCard>
        </div>
      )}
    </>
  );
}
