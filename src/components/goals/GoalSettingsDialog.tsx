import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { GoalType, DEFAULT_GOALS } from '@/hooks/useUserGoals';
import { useTranslation } from 'react-i18next';
import { Briefcase, GraduationCap, Dumbbell, Footprints, DollarSign, TrendingDown } from 'lucide-react';

interface GoalSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalType: GoalType;
  currentValue: number;
  onSave: (value: number) => void;
}

const GOAL_CONFIG: Record<GoalType, { icon: React.ReactNode; min: number; max: number; step: number; unit: string }> = {
  work_hours: { icon: <Briefcase className="w-5 h-5" />, min: 0, max: 16, step: 0.5, unit: 'hrs' },
  study_hours: { icon: <GraduationCap className="w-5 h-5" />, min: 0, max: 12, step: 0.5, unit: 'hrs' },
  mma_hours: { icon: <Dumbbell className="w-5 h-5" />, min: 0, max: 8, step: 0.5, unit: 'hrs' },
  walk_km: { icon: <Footprints className="w-5 h-5" />, min: 0, max: 30, step: 1, unit: 'km' },
  income_monthly: { icon: <DollarSign className="w-5 h-5" />, min: 0, max: 50000, step: 500, unit: 'USD' },
  expenses_daily: { icon: <TrendingDown className="w-5 h-5" />, min: 0, max: 1000, step: 10, unit: 'USD' },
};

export function GoalSettingsDialog({ open, onOpenChange, goalType, currentValue, onSave }: GoalSettingsDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(currentValue);
  const config = GOAL_CONFIG[goalType];

  const handleSave = () => {
    onSave(value);
    onOpenChange(false);
  };

  const goalLabels: Record<GoalType, string> = {
    work_hours: t('goals.workHours', 'ساعات العمل'),
    study_hours: t('goals.studyHours', 'ساعات الدراسة'),
    mma_hours: t('goals.mmaHours', 'ساعات MMA'),
    walk_km: t('goals.walking', 'المشي'),
    income_monthly: t('goals.income', 'الدخل'),
    expenses_daily: t('goals.expenses', 'المصروفات'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {t('goals.editGoal', 'تعديل الهدف')}: {goalLabels[goalType]}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal-value">
              {t('goals.targetValue', 'القيمة المستهدفة')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="goal-value"
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                min={config.min}
                max={config.max}
                step={config.step}
                className="text-center text-2xl font-bold"
              />
              <span className="text-sm text-muted-foreground min-w-12">
                {config.unit}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Slider
              value={[value]}
              onValueChange={([v]) => setValue(v)}
              min={config.min}
              max={config.max}
              step={config.step}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{config.min} {config.unit}</span>
              <span>{config.max} {config.unit}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'إلغاء')}
            </Button>
            <Button onClick={handleSave}>
              {t('common.save', 'حفظ')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
