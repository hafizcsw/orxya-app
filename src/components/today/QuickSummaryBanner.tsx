import { motion } from 'framer-motion';
import { Target, Clock, AlertTriangle, Focus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface QuickSummaryBannerProps {
  dailyProgress: number;
  nextPrayer?: {
    name: string;
    timeRemaining: string;
  };
  conflictsCount: number;
  focusMode: boolean;
  onToggleFocus: (active: boolean) => void;
}

export function QuickSummaryBanner({
  dailyProgress,
  nextPrayer,
  conflictsCount,
  focusMode,
  onToggleFocus
}: QuickSummaryBannerProps) {
  const { t } = useTranslation('today');
  const navigate = useNavigate();

  const summaryCards = [
    {
      id: 'progress',
      icon: <Target className="w-5 h-5" />,
      label: 'تقدم اليوم',
      value: `${dailyProgress}%`,
      color: 'bg-primary/10 text-primary border-primary/20',
      onClick: undefined
    },
    {
      id: 'prayer',
      icon: <Clock className="w-5 h-5" />,
      label: nextPrayer?.name || 'الصلاة القادمة',
      value: nextPrayer?.timeRemaining || '--',
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      onClick: undefined
    },
    {
      id: 'conflicts',
      icon: <AlertTriangle className="w-5 h-5" />,
      label: 'التعارضات',
      value: conflictsCount > 0 ? `${conflictsCount}` : 'لا يوجد',
      color: conflictsCount > 0 
        ? 'bg-destructive/10 text-destructive border-destructive/20' 
        : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
      onClick: conflictsCount > 0 ? () => navigate('/conflicts') : undefined
    },
    {
      id: 'focus',
      icon: <Focus className="w-5 h-5" />,
      label: 'وضع التركيز',
      value: focusMode ? 'مفعّل' : 'معطّل',
      color: focusMode 
        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' 
        : 'bg-muted/50 text-muted-foreground border-border',
      onClick: () => onToggleFocus(!focusMode)
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {summaryCards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
              card.color,
              card.onClick && "cursor-pointer hover:scale-105 hover:shadow-lg"
            )}
            onClick={card.onClick}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-background/50 flex items-center justify-center">
                {card.icon}
              </div>
              
              <div className="flex-1 min-w-0 text-right">
                <div className="text-xs font-medium opacity-80 mb-1">
                  {card.label}
                </div>
                <div className="text-lg font-bold truncate">
                  {card.value}
                </div>
              </div>
            </div>

            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
