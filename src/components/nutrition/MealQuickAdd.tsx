import { useState } from "react";
import { useEdgeFunction } from "@/hooks/useEdgeFunction";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function MealQuickAdd() {
  const [text, setText] = useState("");
  const [qty, setQty] = useState("");
  const { execute: estimate, loading } = useEdgeFunction("nutrition-estimator");
  const { toast } = useToast();

  async function onAdd() {
    if (!text.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال وصف الوجبة",
        variant: "destructive"
      });
      return;
    }

    try {
      const est = await estimate({ food_description: text, quantity: qty });
      if (!est) return;

      const { error } = await supabase.from("meals_log").insert({
        input_text: text,
        quantity: qty || null,
        kcal: Math.round(est.kcal),
        carbs_g: Math.round(est.carbs_g),
        fat_g: Math.round(est.fat_g),
        protein_g: Math.round(est.protein_g),
        confidence: est.confidence,
        source_db: est.source_db,
        meta: est.note ? { note: est.note } : null
      });

      if (error) throw error;

      toast({
        title: "تمت الإضافة ✓",
        description: `${Math.round(est.kcal)} سعرة حرارية • الثقة: ${(est.confidence * 100).toFixed(0)}%`
      });

      setText("");
      setQty("");
    } catch (error) {
      console.error("Error adding meal:", error);
      toast({
        title: "خطأ",
        description: "فشل إضافة الوجبة",
        variant: "destructive"
      });
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🍽️</span>
        <h3 className="font-semibold">إضافة وجبة سريعة</h3>
      </div>

      <Input
        placeholder="مثال: كبسة دجاج"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={loading}
      />

      <Input
        placeholder="الكمية (اختياري)"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        disabled={loading}
      />

      <Button
        onClick={onAdd}
        disabled={loading || !text.trim()}
        className="w-full"
      >
        {loading ? "يحسب..." : "إضافة"}
      </Button>

      <p className="text-xs text-muted-foreground">
        التقدير الغذائي قد لا يكون دقيقًا بنسبة 100%. استشر أخصائي تغذية للنصائح الطبية.
      </p>
    </Card>
  );
}
