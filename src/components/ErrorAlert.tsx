import { AlertTriangle, RefreshCcw, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

export function ErrorAlert({
  title = 'حدث خطأ',
  message,
  onRetry,
  onDismiss,
  className,
  variant = 'error',
}: ErrorAlertProps) {
  const variantStyles = {
    error: 'bg-destructive/10 border-destructive/30 text-destructive',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400',
  };

  const iconColor = {
    error: 'text-destructive',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400',
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl border p-6 space-y-4',
        variantStyles[variant],
        className
      )}
    >
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 left-3 p-1 rounded-lg hover:bg-background/50 transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', 
            variant === 'error' ? 'bg-destructive/20' : 
            variant === 'warning' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
          )}>
            <AlertTriangle className={cn('w-5 h-5', iconColor[variant])} />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-lg">{title}</h3>
          <p className="text-sm leading-relaxed opacity-90">{message}</p>

          {onRetry && (
            <div className="pt-2">
              <Button
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCcw className="w-4 h-4" />
                إعادة المحاولة
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
