import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAIChat, type Message } from '@/hooks/useAIChat';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTED_QUESTIONS = [
  "كيف أدائي اليوم؟",
  "ما هي توصياتك لي الآن؟",
  "هل أنا على المسار الصحيح لأهدافي؟",
  "ما المهم الآن؟",
  "كيف طاقتي وصحتي؟",
];

interface AIChatProps {
  onClose: () => void;
}

export function AIChat({ onClose }: AIChatProps) {
  const { toast } = useToast();
  const { messages, isStreaming, sendMessage, clearMessages } = useAIChat({
    onError: (error) => {
      toast({
        title: "خطأ",
        description: error,
        variant: "destructive",
      });
    },
  });

  const [input, setInput] = useState('');
  const [showContext, setShowContext] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (message: string) => {
    if (!message.trim() || isStreaming) return;

    setInput('');
    await sendMessage(message, true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Sparkles className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h2 className="font-bold text-lg">AI Insights</h2>
            <p className="text-xs text-muted-foreground">مساعدك الذكي الشخصي</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearMessages}
              className="text-xs"
            >
              مسح
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <AnimatePresence>
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full gap-6 py-12"
            >
              <div className="p-4 rounded-full bg-violet-500/10">
                <Sparkles className="w-12 h-12 text-violet-500" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">مرحباً! كيف يمكنني مساعدتك؟</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  اسألني عن أدائك، أهدافك، أو احصل على توصيات مخصصة بناءً على بياناتك
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="space-y-2 w-full max-w-md">
                <p className="text-xs text-muted-foreground text-center mb-3">أسئلة مقترحة:</p>
                <div className="grid gap-2">
                  {SUGGESTED_QUESTIONS.map((question, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="justify-start text-right h-auto py-3 hover:bg-violet-500/10"
                      onClick={() => handleSubmit(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card
                    className={`max-w-[80%] p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  </Card>
                </motion.div>
              ))}
              {isStreaming && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <Card className="bg-muted p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Context Panel */}
      {showContext && (
        <Card className="mx-4 mb-2 p-3 bg-muted/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium">السياق المرسل للذكاء الاصطناعي</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContext(false)}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            يتم إرسال بياناتك الحالية (المهام، النشاطات، الأهداف) مع كل رسالة لتحسين الردود
          </p>
        </Card>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-background/95 backdrop-blur">
        {!showContext && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContext(true)}
            className="w-full mb-2 text-xs"
          >
            <ChevronUp className="w-3 h-3 ml-1" />
            عرض السياق المرسل
          </Button>
        )}
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب سؤالك هنا..."
            className="resize-none min-h-[60px] max-h-[120px]"
            disabled={isStreaming}
          />
          <Button
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="shrink-0 h-[60px] w-[60px]"
          >
            {isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
