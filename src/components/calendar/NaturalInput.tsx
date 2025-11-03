import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";

type NaturalInputProps = {
  onEventCreated?: () => void;
};

export default function NaturalInput({ onEventCreated }: NaturalInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('nlp-quickadd', {
        body: { text }
      });

      if (error) {
        console.error('NLP error:', error);
        toast.error('فشل إنشاء الحدث');
        return;
      }

      toast.success(`تم إنشاء: ${data.event.title} (مسودة)`);
      setText("");
      onEventCreated?.();
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('خطأ في المعالجة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب موعدك بشكل طبيعي... مثل: غدًا 3 م: مكالمة عمر 45د"
          className="pl-10 pr-10"
          disabled={loading}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </form>
  );
}
