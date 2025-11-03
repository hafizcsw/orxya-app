import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPENSE_CATEGORIES = [
  'طعام', 'مواصلات', 'خدمات', 'صحة', 
  'تعليم', 'ترفيه', 'تسوق', 'فواتير',
  'إيجار', 'استثمار', 'أخرى'
] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'النص مطلوب' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY غير موجود');
    }

    const systemPrompt = `أنت مصنف ذكي للمصروفات. بناءً على النص المقدم من رسالة بنك أو وصف للمصروف، حدد الفئة الأنسب من القائمة التالية:

${EXPENSE_CATEGORIES.join(', ')}

قواعد التصنيف:
- طعام: مطاعم، بقالة، كافيهات، وجبات سريعة
- مواصلات: وقود، تاكسي، أوبر، صيانة سيارة، مواصلات عامة
- خدمات: كهرباء، ماء، انترنت، هاتف، صيانة منزل
- صحة: أدوية، مستشفيات، عيادات، تأمين صحي
- تعليم: رسوم دراسية، كتب، دورات، تدريب
- ترفيه: سينما، ألعاب، سفر، هوايات
- تسوق: ملابس، إلكترونيات، أثاث، هدايا
- فواتير: فواتير شهرية ثابتة
- إيجار: إيجار منزل أو مكتب
- استثمار: أسهم، عقارات، ذهب
- أخرى: أي شيء لا يندرج تحت الفئات السابقة

أعد فقط اسم الفئة بالعربية بدون أي نص إضافي.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_completion_tokens: 50,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'تم تجاوز حد الطلبات، حاول لاحقاً' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'الرصيد منتهي، أضف رصيد لحسابك' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const category = data.choices[0]?.message?.content?.trim() || 'أخرى';
    
    // التحقق من أن الفئة المرجعة صحيحة
    const validCategory = EXPENSE_CATEGORIES.includes(category as any) ? category : 'أخرى';

    return new Response(
      JSON.stringify({ 
        category: validCategory,
        original_text: text 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in categorize-expense:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'خطأ غير معروف' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
