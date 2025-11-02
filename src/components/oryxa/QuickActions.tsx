import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  id: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'accent';
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  const variantColors = {
    primary: {
      bg: 'bg-primary',
      text: 'text-primary-foreground',
      glow: 'shadow-[0_0_20px_hsl(var(--primary)/0.3)]',
    },
    secondary: {
      bg: 'bg-secondary',
      text: 'text-secondary-foreground',
      glow: '',
    },
    success: {
      bg: 'bg-success',
      text: 'text-success-foreground',
      glow: 'shadow-[0_0_20px_hsl(var(--success)/0.3)]',
    },
    accent: {
      bg: 'bg-accent',
      text: 'text-accent-foreground',
      glow: 'shadow-[0_0_20px_hsl(var(--accent)/0.3)]',
    },
  };

  return (
    <div className={cn('flex gap-3 overflow-x-auto pb-2', className)}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        const colors = variantColors[action.variant || 'primary'];

        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              ease: [0.4, 0, 0.2, 1],
            }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-2xl min-w-[100px]',
              'transition-all duration-300',
              colors.bg,
              colors.text,
              colors.glow,
              'hover:shadow-lg'
            )}
          >
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Icon className="h-6 w-6" />
            </div>
            <span className="text-xs font-medium text-center whitespace-nowrap">
              {action.label}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
