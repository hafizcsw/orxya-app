import { useState, useRef, useEffect } from 'react';
import { askAgent } from '@/lib/agent';
import { useUser } from '@/lib/auth';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function Assistant() {
  const { user } = useUser();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function sendMessage() {
    const msg = input.trim();
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
    setInput('');
    setIsLoading(true);

    try {
      const response = await askAgent(msg);
      
      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', text: response.reply || 'تم التنفيذ بنجاح' },
        ]);
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

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-6 h-6 text-primary" />
        <h1 className="text-3xl font-bold">المساعد الذكي</h1>
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
          onClick={sendMessage}
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
  );
}
