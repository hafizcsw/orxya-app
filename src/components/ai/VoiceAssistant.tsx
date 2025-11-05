import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, Loader2, Trash2, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { askAgentHub } from '@/lib/agent-hub';
import {
  getOrCreateConversation,
  getConversationHistory,
  saveMessage,
  createNewConversation,
  VoiceMessage,
} from '@/lib/voice-assistant';
import { cn } from '@/lib/utils';

export function VoiceAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    initConversation();
  }, []);

  useEffect(() => {
    // Auto scroll to bottom
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const initConversation = async () => {
    try {
      const convId = await getOrCreateConversation();
      setConversationId(convId);
      const history = await getConversationHistory(convId);
      setMessages(history);
    } catch (error) {
      console.error('Failed to init conversation:', error);
    }
  };

  const startNewConversation = async () => {
    try {
      const convId = await createNewConversation();
      setConversationId(convId);
      setMessages([]);
      toast({
        title: "✨ محادثة جديدة",
        description: "تم بدء محادثة جديدة",
      });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const clearConversation = () => {
    setMessages([]);
    startNewConversation();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      toast({
        title: "🎙️ جاري التسجيل",
        description: "تحدث الآن...",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "خطأ",
        description: "فشل الوصول إلى الميكروفون",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!conversationId) {
      toast({
        title: "خطأ",
        description: "لا يوجد محادثة نشطة",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Convert audio to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      await new Promise((resolve) => {
        reader.onloadend = resolve;
      });
      
      const base64Audio = (reader.result as string).split(',')[1];

      // Speech to Text
      const { data: sttData, error: sttError } = await supabase.functions.invoke(
        'voice-to-text',
        { body: { audio: base64Audio } }
      );

      if (sttError) throw sttError;

      const userText = sttData.text;
      
      // Save user message
      await saveMessage(conversationId, 'user', userText);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: userText,
        created_at: new Date().toISOString(),
      }]);

      toast({
        title: "✅ تم التعرف على الصوت",
        description: userText,
      });

      // Get conversation history for context
      const history = await getConversationHistory(conversationId);
      
      // Build context message
      const contextMessage = history.length > 1 
        ? `السياق السابق:\n${history.slice(-4).map(m => `${m.role === 'user' ? 'أنا' : 'المساعد'}: ${m.content}`).join('\n')}\n\nالطلب الحالي: ${userText}`
        : userText;

      // Process with AI Agent
      const agentResponse = await askAgentHub(contextMessage);
      
      if (!agentResponse.ok) {
        throw new Error(agentResponse.error || 'فشل معالجة الطلب');
      }

      let aiReply = agentResponse.assistant_message || 'تم تنفيذ الأمر';
      
      // Add action results to response
      if (agentResponse.applied_actions && agentResponse.applied_actions.length > 0) {
        aiReply += '\n\nتم تنفيذ الإجراءات التالية:\n';
        agentResponse.applied_actions.forEach(action => {
          aiReply += `- ${action.action.type}\n`;
        });
      }

      // Save assistant message
      await saveMessage(conversationId, 'assistant', aiReply);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiReply,
        created_at: new Date().toISOString(),
      }]);

      // Text to Speech
      const { data: ttsData, error: ttsError } = await supabase.functions.invoke(
        'text-to-voice',
        { body: { text: aiReply } }
      );

      if (ttsError) throw ttsError;

      // Play audio
      setIsSpeaking(true);
      const audio = new Audio(`data:audio/mp3;base64,${ttsData.audioContent}`);
      audio.onended = () => setIsSpeaking(false);
      await audio.play();

      toast({
        title: "✨ تم التنفيذ",
        description: "تم معالجة طلبك بنجاح",
      });

    } catch (error: any) {
      console.error('Processing error:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشلت معالجة الصوت",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-primary/20 h-[600px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          المساعد الصوتي
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startNewConversation}
            disabled={isProcessing || isRecording}
          >
            <MessageSquarePlus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearConversation}
            disabled={isProcessing || isRecording || messages.length === 0}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Messages Area */}
        <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <p className="mb-2">👋 مرحباً!</p>
                <p className="text-sm">ابدأ محادثة صوتية الآن</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "p-3 rounded-lg max-w-[85%]",
                    msg.role === 'user' 
                      ? "bg-primary/10 ml-auto text-right" 
                      : "bg-muted mr-auto"
                  )}
                >
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">
                    {msg.role === 'user' ? 'أنت' : 'المساعد'}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Recording Button */}
        <div className="flex flex-col items-center gap-4 border-t pt-4">
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || isSpeaking}
            className="w-20 h-20 rounded-full"
          >
            {isProcessing ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            {isProcessing ? 'جاري المعالجة...' : 
             isSpeaking ? 'جاري التحدث...' :
             isRecording ? 'اضغط لإيقاف التسجيل' : 
             'اضغط للبدء بالتحدث'}
          </p>
        </div>

        {/* Commands Help */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          <p className="font-semibold mb-1">أمثلة للأوامر المتقدمة:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>"أضف مهمة: مراجعة الكود غداً الساعة 2 مساءً"</li>
            <li>"ما هي خططي لهذا الأسبوع؟"</li>
            <li>"هل لدي تعارضات مع صلاة العصر اليوم؟"</li>
            <li>"أنشئ حدث: اجتماع مع الفريق يوم الأحد"</li>
            <li>"ذكرني بالاتصال بأحمد بعد ساعة"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
