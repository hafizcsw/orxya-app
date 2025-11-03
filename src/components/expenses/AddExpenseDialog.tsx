import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CATEGORY_CONFIG } from './CategoryIcon';

const CATEGORIES = Object.keys(CATEGORY_CONFIG);

export function AddExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    note: '',
    text: '',
    entry_date: new Date().toISOString().split('T')[0],
  });

  const handleAnalyzeText = async () => {
    if (!formData.text.trim()) {
      toast.error('الرجاء إدخال نص للتحليل');
      return;
    }

    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('categorize-expense', {
        body: { text: formData.text }
      });

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        category: data.category,
        note: prev.note || formData.text,
      }));

      toast.success('تم تحليل المصروف بنجاح!');
    } catch (error: any) {
      console.error('Error analyzing expense:', error);
      toast.error(error.message || 'فشل تحليل المصروف');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category) {
      toast.error('الرجاء إدخال المبلغ والفئة');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('commands', {
        body: {
          command: 'add_finance',
          idempotency_key: `expense_${Date.now()}_${Math.random()}`,
          payload: {
            entry_date: formData.entry_date,
            type: 'spend',
            amount_usd: parseFloat(formData.amount),
            category: formData.category,
            note: formData.note || undefined,
          }
        }
      });

      if (error) throw error;

      toast.success('تم إضافة المصروف بنجاح');
      setOpen(false);
      setFormData({
        amount: '',
        category: '',
        note: '',
        text: '',
        entry_date: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      console.error('Error adding expense:', error);
      toast.error(error.message || 'فشل إضافة المصروف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus size={18} />
          إضافة مصروف
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة مصروف جديد</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* AI Analysis Section */}
          <div className="space-y-2">
            <Label>تحليل ذكي من رسالة البنك</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="الصق نص رسالة البنك هنا..."
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                rows={3}
                className="flex-1"
              />
            </div>
            <Button 
              type="button"
              variant="outline" 
              onClick={handleAnalyzeText}
              disabled={analyzing || !formData.text.trim()}
              className="w-full gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  جاري التحليل...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  تحليل بالذكاء الاصطناعي
                </>
              )}
            </Button>
          </div>

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">المبلغ ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">الفئة</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">ملاحظة (اختياري)</Label>
              <Input
                id="note"
                placeholder="تفاصيل المصروف..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">التاريخ</Label>
              <Input
                id="date"
                type="date"
                value={formData.entry_date}
                onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin ml-2" size={16} />
                جاري الحفظ...
              </>
            ) : (
              'حفظ المصروف'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
