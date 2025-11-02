import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/lib/auth';
import { track } from '@/lib/telemetry';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Send, User, Bot } from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: any;
  created_at: string;
};

export default function PlannerChat() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadThread();
  }, [user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadThread() {
    if (!user) return;

    // جلب آخر محادثة أو إنشاء جديدة
    const { data: threads } = await supabase
      .from('agent_threads')
      .select('id')
      .eq('owner_id', user.id)
      .eq('kind', 'planner')
      .order('updated_at', { ascending: false })
      .limit(1);

    const tid = threads?.[0]?.id;
    setThreadId(tid || null);

    if (tid) {
      const { data } = await supabase
        .from('agent_messages')
        .select('*')
        .eq('thread_id', tid)
        .order('created_at', { ascending: true });

      setMessages((data || []) as Message[]);
    }
  }

  async function sendMessage() {
    if (!input.trim() || loading || !user) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    // إضافة رسالة المستخدم مؤقتًا
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: { text: userMsg },
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase.functions.invoke('planner-agent', {
        body: {
          thread_id: threadId,
          message: userMsg
        }
      });

      if (error) {
        if (error.message?.includes('FEATURE_OFF')) {
          toast({
            title: 'الميزة غير متاحة',
            description: 'المخطط الذكي في مرحلة التجربة المحدودة',
            variant: 'destructive'
          });
        } else if (error.message?.includes('OPENAI_KEY_NOT_CONFIGURED')) {
          toast({
            title: 'خطأ في الإعداد',
            description: 'مفتاح OpenAI غير مُعدّ',
            variant: 'destructive'
          });
        } else {
          throw error;
        }
        // إزالة الرسالة المؤقتة
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        return;
      }

      if (data?.thread_id) {
        setThreadId(data.thread_id);
      }

      // إعادة تحميل الرسائل
      await loadThread();
      track('planner_message_sent');

    } catch (e: any) {
      console.error(e);
      toast({
        title: 'خطأ',
        description: 'فشل إرسال الرسالة',
        variant: 'destructive'
      });
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setLoading(false);
    }
  }

  async function newChat() {
    setMessages([]);
    setThreadId(null);
    track('planner_new_chat');
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground">
          سجّل الدخول لاستخدام المخطط الذكي
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">المخطط الذكي</h1>
          <p className="text-sm text-muted-foreground">
            مساعدك الشخصي لتخطيط اليوم والأسبوع
          </p>
        </div>
        <Button onClick={newChat} variant="outline" size="sm">
          محادثة جديدة
        </Button>
      </div>

      {/* الرسائل */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 border rounded-2xl p-4 bg-card">
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
          messages.map((msg) => {
            if (msg.role === 'tool') return null; // لا نعرض رسائل الأدوات

            const isUser = msg.role === 'user';
            const text = msg.content?.text || '';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    isUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{text}</div>
                </div>

                {isUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="bg-secondary px-4 py-3 rounded-2xl">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* حقل الإدخال */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="اكتب رسالتك هنا..."
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-2xl border bg-background disabled:opacity-50"
        />
        <Button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          size="lg"
          className="px-6"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </Button>
      </div>
    </div>
  );
}
