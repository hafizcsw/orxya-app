import { motion } from 'framer-motion';
import { Clock, ChevronRight, Zap, Briefcase, BookOpen, Activity, Users, Coffee } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
interface CurrentTaskCardProps {
  task: {
    id: string;
    title: string;
    category: string;
    starts_at: string;
    ends_at: string;
  } | null;
  timeRemaining: number;
  progress: number;
  nextTask?: {
    title: string;
    starts_at: string;
  } | null;
}
const categoryColors = {
  work: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  study: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
  sport: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  mma: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
  meeting: 'from-green-500/20 to-green-600/20 border-green-500/30',
  other: 'from-slate-500/20 to-slate-600/20 border-slate-500/30'
};
export function CurrentTaskCard({
  task,
  timeRemaining,
  progress,
  nextTask
}: CurrentTaskCardProps) {
  const {
    t
  } = useTranslation();
  const getCategoryIcon = (category?: string) => {
    const icons = {
      work: Briefcase,
      study: BookOpen,
      sport: Activity,
      mma: Activity,
      meeting: Users,
      break: Coffee
    };
    return icons[category?.toLowerCase() || 'work'] || Clock;
  };
  if (!task) {
    return;
  }
  const category = task.category as keyof typeof categoryColors;
  const gradientClass = categoryColors[category] || categoryColors.other;
  const TaskIcon = getCategoryIcon(task.category);
  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) return `${hrs}س ${mins}د`;
    return `${mins}د`;
  };
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3
  }}>
      <Card className={cn("relative overflow-hidden border-2", "bg-gradient-to-br", gradientClass)}>
        {/* Pulsating border animation */}
        <motion.div className="absolute inset-0 border-2 border-primary/50 rounded-lg" animate={{
        opacity: [0.5, 1, 0.5],
        scale: [1, 1.02, 1]
      }} transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }} />

        <div className="relative p-4 md:p-6 space-y-3 md:space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
              <TaskIcon className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm md:text-lg leading-tight truncate">{task.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {new Date(task.starts_at).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit'
                })} - {new Date(task.ends_at).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="shrink-0 gap-1 px-2 md:px-3 py-0.5 md:py-1">
              <Zap className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span className="text-[10px] md:text-xs">{t('today.currentTask.liveBadge')}</span>
            </Badge>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center gap-2 md:gap-3">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">{t('today.currentTask.timeRemaining')}</p>
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {formatTime(timeRemaining)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex justify-between text-xs md:text-sm">
              <span className="text-muted-foreground">{t('today.currentTask.progress')}</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5 md:h-2" />
          </div>

          {/* Next Task Preview */}
          {nextTask && <motion.div initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.2
        }} className="flex items-center gap-2 p-2 md:p-3 rounded-lg bg-background/50 backdrop-blur-sm">
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground">{t('today.currentTask.next')}</p>
                <p className="text-xs md:text-sm font-medium text-foreground truncate">{nextTask.title}</p>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground shrink-0">
                {new Date(nextTask.starts_at).toLocaleTimeString('ar-EG', {
              hour: '2-digit',
              minute: '2-digit'
            })}
              </p>
            </motion.div>}
        </div>
      </Card>
    </motion.div>;
}