import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md'
}: EmptyStateProps) {
  const sizes = {
    sm: {
      container: 'p-4',
      icon: 'w-12 h-12',
      title: 'text-sm',
      description: 'text-xs',
    },
    md: {
      container: 'p-8',
      icon: 'w-16 h-16',
      title: 'text-base',
      description: 'text-sm',
    },
    lg: {
      container: 'p-12',
      icon: 'w-20 h-20',
      title: 'text-lg',
      description: 'text-base',
    },
  };

  const sizeClasses = sizes[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'rounded-xl border border-dashed border-border/50',
        'bg-muted/20 backdrop-blur-sm',
        sizeClasses.container,
        className
      )}
    >
      {Icon && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 200, 
            damping: 15,
            delay: 0.1 
          }}
          className="mb-4"
        >
          <div className={cn(
            'rounded-full bg-primary/10 p-4 flex items-center justify-center',
            'ring-8 ring-primary/5'
          )}>
            <Icon className={cn(sizeClasses.icon, 'text-primary/60')} />
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="space-y-2"
      >
        <h3 className={cn(
          'font-semibold text-foreground',
          sizeClasses.title
        )}>
          {title}
        </h3>
        
        {description && (
          <p className={cn(
            'text-muted-foreground max-w-sm mx-auto',
            sizeClasses.description
          )}>
            {description}
          </p>
        )}
      </motion.div>

      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="mt-6"
        >
          <Button
            variant={action.variant || 'default'}
            onClick={action.onClick}
            className="shadow-lg hover:shadow-xl transition-shadow"
          >
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}
