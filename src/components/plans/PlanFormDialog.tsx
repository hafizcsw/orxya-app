import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { NeonButton } from '@/components/ui/NeonButton';
import { cn } from '@/lib/utils';
import { BusinessPlan, BusinessPlanFormData } from '@/types/business-plan';

interface PlanFormDialogProps {
  plan?: BusinessPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: BusinessPlanFormData) => Promise<void>;
}

const iconOptions = [
  'Award', 'Building', 'DollarSign', 'Briefcase', 
  'Home', 'GraduationCap', 'TrendingUp', 'Rocket',
  'Target', 'LineChart', 'PieChart', 'Package'
];

const colorPresets = [
  { name: 'أخضر', value: 'hsl(142, 76%, 36%)' },
  { name: 'أزرق', value: 'hsl(221, 83%, 53%)' },
  { name: 'أصفر', value: 'hsl(48, 96%, 53%)' },
  { name: 'أحمر', value: 'hsl(0, 84%, 60%)' },
  { name: 'بنفسجي', value: 'hsl(260, 70%, 60%)' },
  { name: 'وردي', value: 'hsl(330, 80%, 65%)' }
];

const categories = [
  { value: 'business', label: 'أعمال' },
  { value: 'investment', label: 'استثمار' },
  { value: 'real-estate', label: 'عقارات' },
  { value: 'education', label: 'تعليم' }
];

export function PlanFormDialog({ plan, isOpen, onClose, onSave }: PlanFormDialogProps) {
  const [formData, setFormData] = useState<BusinessPlanFormData>({
    name: '',
    slug: '',
    icon: 'DollarSign',
    color: 'hsl(142, 76%, 36%)',
    category: 'business',
    target_monthly: 0,
    description: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        slug: plan.slug,
        icon: plan.icon,
        color: plan.color,
        category: plan.category,
        target_monthly: plan.target_monthly,
        description: plan.description || ''
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        icon: 'DollarSign',
        color: 'hsl(142, 76%, 36%)',
        category: 'business',
        target_monthly: 0,
        description: ''
      });
    }
  }, [plan, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('الرجاء إدخال اسم الخطة');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving plan:', error);
      alert('حدث خطأ أثناء حفظ الخطة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <HolographicCard 
        variant="neon" 
        glow 
        className="w-full max-w-md animate-scale-in"
      >
        <div className="relative p-6 space-y-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <h2 className="text-2xl font-bold gradient-text">
            {plan ? 'تعديل الخطة' : 'إضافة خطة جديدة'}
          </h2>
          
          {/* Name input */}
          <div>
            <label className="text-sm font-medium mb-1 block">الاسم</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="مثال: منح دراسية"
            />
          </div>
          
          {/* Icon picker */}
          <div>
            <label className="text-sm font-medium mb-2 block">الأيقونة</label>
            <div className="grid grid-cols-4 gap-2">
              {iconOptions.map(iconName => {
                const Icon = (LucideIcons as any)[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setFormData({...formData, icon: iconName})}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all",
                      formData.icon === iconName 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Icon className="w-6 h-6 mx-auto" />
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Color picker */}
          <div>
            <label className="text-sm font-medium mb-2 block">اللون</label>
            <div className="grid grid-cols-3 gap-2">
              {colorPresets.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setFormData({...formData, color: color.value})}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all text-sm font-medium",
                    formData.color === color.value 
                      ? "border-primary" 
                      : "border-border hover:border-primary/50"
                  )}
                  style={{ 
                    backgroundColor: `${color.value}20`,
                    color: color.value
                  }}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-1 block">التصنيف</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value as any})}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          
          {/* Target monthly */}
          <div>
            <label className="text-sm font-medium mb-1 block">الهدف الشهري ($)</label>
            <input 
              type="number"
              value={formData.target_monthly || ''}
              onChange={(e) => setFormData({...formData, target_monthly: Number(e.target.value)})}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="10000"
              min="0"
            />
          </div>
          
          {/* Description */}
          <div>
            <label className="text-sm font-medium mb-1 block">الوصف (اختياري)</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="وصف مختصر للخطة..."
              rows={3}
            />
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <NeonButton 
              variant="primary" 
              glow
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </NeonButton>
            <NeonButton 
              variant="ghost" 
              onClick={onClose}
              disabled={saving}
              className="flex-1"
            >
              إلغاء
            </NeonButton>
          </div>
        </div>
      </HolographicCard>
    </div>
  );
}