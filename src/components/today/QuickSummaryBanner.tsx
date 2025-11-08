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
  const {
    t
  } = useTranslation('today');
  const navigate = useNavigate();
  const summaryCards = [{
    id: 'progress',
    icon: <Target className="w-5 h-5" />,
    label: 'تقدم اليوم',
    value: `${dailyProgress}%`,
    color: 'bg-primary/10 text-primary border-primary/20',
    onClick: undefined
  }, {
    id: 'prayer',
    icon: <Clock className="w-5 h-5" />,
    label: nextPrayer?.name || 'الصلاة القادمة',
    value: nextPrayer?.timeRemaining || '--',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    onClick: undefined
  }, {
    id: 'conflicts',
    icon: <AlertTriangle className="w-5 h-5" />,
    label: 'التعارضات',
    value: conflictsCount > 0 ? `${conflictsCount}` : 'لا يوجد',
    color: conflictsCount > 0 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    onClick: conflictsCount > 0 ? () => navigate('/conflicts') : undefined
  }, {
    id: 'focus',
    icon: <Focus className="w-5 h-5" />,
    label: 'وضع التركيز',
    value: focusMode ? 'مفعّل' : 'معطّل',
    color: focusMode ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' : 'bg-muted/50 text-muted-foreground border-border',
    onClick: () => onToggleFocus(!focusMode)
  }];
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {summaryCards.map((card, index) => <motion.div key={card.id} initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: index * 0.1
    }}>
          
        </motion.div>)}
    </div>;
}