import { useState, useRef, useEffect } from 'react';
import { askAgent, getSessions, createSession, archiveSession } from '@/lib/agent';
import { useUser } from '@/lib/auth';
import { Send, Sparkles, Loader2, Plus, Archive, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface Session {
  id: string;
  title: string;
  last_activity: string;
}

export default function Assistant() {
  const { user } = useUser();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  async function loadSessions() {
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (e) {
      console.error('Failed to load sessions:', e);
    }
  }

  async function handleNewSession() {
    try {
      const session = await createSession('جلسة جديدة');
      setCurrentSessionId(session.id);
      setMessages([]);
      await loadSessions();
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }

  async function handleArchiveSession(id: string) {
    try {
      await archiveSession(id);
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      await loadSessions();
    } catch (e) {
      console.error('Failed to archive session:', e);
    }
  }

  function handleQuickAction(action: string) {
    sendMessage(action);
  }

  async function sendMessage(quickAction?: string) {
    const msg = quickAction || input.trim();
    if (!msg || isLoading) return;

    if (!user) {
      toast({
        title: 'غير مسجل دخول',
        description: 'يجب تسجيل الدخول لاستخدام المساعد',
        variant: 'destructive',
      });
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    if (!quickAction) setInput('');
    setIsLoading(true);

    try {
      const response = await askAgent(msg, { session_id: currentSessionId || undefined });
      
      if (response.ok) {
        if (response.session_id && !currentSessionId) {
          setCurrentSessionId(response.session_id);
          await loadSessions();
        }

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: response.reply || 'تم التنفيذ بنجاح' },
        ]);

        // Check for conflict warnings
        const conflicts = response.tool_outputs?.find(
          (t: any) => t.name === 'conflict_check' || t.result?.summary === 'post-flight check'
        );
        if (conflicts?.result?.count > 0) {
          toast({
            title: '⛔️ تعارض مع مواقيت الصلاة',
            description: `وُجدت ${conflicts.result.count} تعارضات`,
            variant: 'destructive',
          });
        }

        // Check for template application
        const templateResult = response.tool_outputs?.find(
          (t: any) => t.name === 'apply_template'
        );
        if (templateResult?.result?.inserted > 0) {
          toast({
            title: '✅ تم تطبيق القالب',
            description: `تم إضافة ${templateResult.result.inserted} حدث/أحداث`,
          });
        }

        // Check for summary
        const summaryResult = response.tool_outputs?.find(
          (t: any) => t.name === 'summarize_period'
        );
        if (summaryResult?.result?.summary) {
          // Summary is shown in the chat message
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `⚠️ حدث خطأ: ${response.error || 'Unknown error'}`,
          },
        ]);
      }
    } catch (error: any) {
      console.error('Send message error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ فشل الاتصال: ${error?.message ?? error}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    'خطة اليوم بعد العشاء',
    'راجع التعارضات للأسبوع',
    'أضف: متابعة عميل غدًا قبل الظهر',
  ];

  const templates = [
    { key: 'work_after_maghrib', label: 'عمل بعد المغرب', icon: '💼' },
    { key: 'gym_after_isha', label: 'تمرين بعد العشاء', icon: '💪' },
    { key: 'deep_work_morning', label: 'عمل عميق صباحاً', icon: '🌅' },
    { key: 'balanced_day', label: 'يوم متوازن', icon: '⚖️' },
  ];

  const summaryOptions = [
    { span: 'day', label: 'ملخص اليوم', icon: '📅' },
    { span: 'week', label: 'ملخص الأسبوع', icon: '📊' },
    { span: 'month', label: 'ملخص الشهر', icon: '📈' },
  ];

  async function applyTemplate(templateKey: string) {
    handleQuickAction(`طبّق قالب ${templateKey}`);
  }

  async function requestSummary(span: string) {
    handleQuickAction(`لخّص ${span === 'day' ? 'اليوم' : span === 'week' ? 'الأسبوع' : 'الشهر'}`);
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] max-w-7xl mx-auto p-4 gap-4">
      {/* Sessions Sidebar */}
      <div className="w-64 border-2 rounded-3xl p-4 bg-card shadow-lg overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            الجلسات
          </h2>
          <button
            onClick={handleNewSession}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="جلسة جديدة"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                currentSessionId === session.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-accent'
              }`}
              onClick={() => {
                setCurrentSessionId(session.id);
                setMessages([]);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm line-clamp-2 flex-1">{session.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchiveSession(session.id);
                  }}
                  className="p-1 hover:bg-background/20 rounded transition-colors"
                >
                  <Archive className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold">المساعد الذكي</h1>
        </div>

        {/* Quick Actions */}
        <div className="mb-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">أسئلة سريعة:</span>
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm rounded-full bg-secondary hover:bg-accent transition-colors disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">قوالب:</span>
            {templates.map((tpl) => (
              <button
                key={tpl.key}
                onClick={() => applyTemplate(tpl.key)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm rounded-full bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                {tpl.icon} {tpl.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">ملخصات:</span>
            {summaryOptions.map((opt) => (
              <button
                key={opt.span}
                onClick={() => requestSummary(opt.span)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm rounded-full bg-accent hover:bg-accent/80 transition-colors disabled:opacity-50"
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 bg-card border-2 rounded-3xl p-6 shadow-lg">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary/30" />
            <p className="text-lg mb-2">مرحباً! كيف يمكنني مساعدتك؟</p>
            <div className="text-sm space-y-1">
              <p>• أنشئ مهمة جديدة</p>
              <p>• رتّب اجتماعي بعد المغرب</p>
              <p>• فحص التعارضات مع الصلاة</p>
              <p>• حدّث مواقيت الصلاة</p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl transition-all duration-200 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.text}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground px-4 py-3 rounded-2xl shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري التفكير...</span>
            </div>
          </div>
        )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب رسالتك... (اضغط Enter للإرسال)"
          className="flex-1 border-2 rounded-2xl px-4 py-3 resize-none shadow-md focus:ring-2 focus:ring-primary transition-all"
          rows={2}
          disabled={isLoading}
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim()}
          className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}
