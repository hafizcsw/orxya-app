import { useState, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { askAgentHub } from '@/lib/agent-hub';

export function VoiceAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

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
      setTranscript(userText);

      toast({
        title: "✅ تم التعرف على الصوت",
        description: userText,
      });

      // Process with AI Agent
      const agentResponse = await askAgentHub(userText);
      
      if (!agentResponse.ok) {
        throw new Error(agentResponse.error || 'فشل معالجة الطلب');
      }

      const aiReply = agentResponse.assistant_message || 'تم تنفيذ الأمر';
      setResponse(aiReply);

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
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          المساعد الصوتي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || isSpeaking}
            className="w-32 h-32 rounded-full"
          >
            {isProcessing ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-12 h-12" />
            ) : (
              <Mic className="w-12 h-12" />
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            {isProcessing ? 'جاري المعالجة...' : 
             isSpeaking ? 'جاري التحدث...' :
             isRecording ? 'اضغط لإيقاف التسجيل' : 
             'اضغط للبدء بالتحدث'}
          </p>
        </div>

        {transcript && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-1">ما قلته:</p>
            <p className="text-sm">{transcript}</p>
          </div>
        )}

        {response && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <p className="text-sm font-semibold mb-1">الرد:</p>
            <p className="text-sm">{response}</p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>أمثلة للأوامر الصوتية:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>"أضف مهمة جديدة: إنهاء التقرير"</li>
            <li>"ما هي مواعيد صلاتي اليوم؟"</li>
            <li>"ساعدني في تنظيم يومي"</li>
            <li>"هل لدي تعارضات مع الصلاة؟"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
