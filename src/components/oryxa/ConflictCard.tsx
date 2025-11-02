import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OryxaButton } from './Button';

interface ConflictCardProps {
  conflict: {
    id: string;
    event1: string;
    event2: string;
    severity: 'high' | 'medium' | 'low';
    suggestedActions: Array<{
      label: string;
      action: string;
      icon?: React.ReactNode;
    }>;
  };
  onResolve: (action: string) => void;
  onDismiss: () => void;
  className?: string;
}

export function ConflictCard({
  conflict,
  onResolve,
  onDismiss,
  className,
}: ConflictCardProps) {
  const severityConfig = {
    high: {
      icon: AlertCircle,
      color: 'hsl(var(--destructive))',
      bgClass: 'bg-destructive/10',
      borderClass: 'border-destructive/30',
    },
    medium: {
      icon: Clock,
      color: 'hsl(var(--warning))',
      bgClass: 'bg-warning/10',
      borderClass: 'border-warning/30',
    },
    low: {
      icon: AlertCircle,
      color: 'hsl(var(--info))',
      bgClass: 'bg-info/10',
      borderClass: 'border-info/30',
    },
  };

  const config = severityConfig[conflict.severity];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'card overflow-hidden',
          config.bgClass,
          config.borderClass,
          className
        )}
      >
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{ backgroundColor: config.color }}
        />

        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: `${config.color}15`,
                  color: config.color,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 space-y-1">
                <h3 className="font-semibold text-foreground">
                  تعارض في الجدول الزمني
                </h3>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">{conflict.event1}</span>
                  {' '}يتعارض مع{' '}
                  <span className="font-medium">{conflict.event2}</span>
                </div>
              </div>
            </div>

            <button
              onClick={onDismiss}
              className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Suggested Actions */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">
              الحلول المقترحة:
            </div>
            <div className="flex flex-wrap gap-2">
              {conflict.suggestedActions.map((action, i) => {
                const ActionIcon = action.icon as any;
                return (
                  <OryxaButton
                    key={i}
                    size="sm"
                    variant={i === 0 ? 'primary' : 'secondary'}
                    onClick={() => onResolve(action.action)}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    {ActionIcon && <ActionIcon className="w-4 h-4" />}
                    {action.label}
                  </OryxaButton>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
