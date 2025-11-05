import { motion } from 'framer-motion';
import { Clock, ChevronRight, Zap } from 'lucide-react';
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
  other: 'from-slate-500/20 to-slate-600/20 border-slate-500/30',
};

export function CurrentTaskCard({ task, timeRemaining, progress, nextTask }: CurrentTaskCardProps) {
  if (!task) {
    return (
      <Card className="p-6 bg-muted/30 border-muted">
        <div className="text-center text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا توجد مهمة حالية</p>
          {nextTask && (
            <div className="mt-4 text-xs">
              <p className="font-medium text-foreground mb-1">المهمة التالية:</p>
              <p>{nextTask.title}</p>
              <p className="text-muted-foreground mt-1">
                {new Date(nextTask.starts_at).toLocaleTimeString('ar-EG', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  const category = task.category as keyof typeof categoryColors;
  const gradientClass = categoryColors[category] || categoryColors.other;

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) return `${hrs}س ${mins}د`;
    return `${mins}د`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "relative overflow-hidden border-2",
        "bg-gradient-to-br",
        gradientClass
      )}>
        {/* Pulsating border animation */}
        <motion.div
          className="absolute inset-0 border-2 border-primary/50 rounded-lg"
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        <div className="relative p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Badge variant="secondary" className="mb-2">
                <Zap className="w-3 h-3 mr-1" />
                مهمة حالية
              </Badge>
              <h3 className="text-xl font-bold text-foreground">{task.title}</h3>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">الوقت المتبقي</p>
              <p className="text-2xl font-bold text-foreground">
                {formatTime(timeRemaining)}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">التقدم</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Next Task Preview */}
          {nextTask && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-background/50 backdrop-blur-sm"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">التالي</p>
                <p className="text-sm font-medium text-foreground">{nextTask.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(nextTask.starts_at).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </motion.div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
