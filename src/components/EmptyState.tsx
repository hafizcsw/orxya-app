import { motion } from 'framer-motion';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  hint?: string;
  cta?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title,
  description,
  hint,
  cta,
  icon,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6 backdrop-blur-sm border border-border/30">
        {icon || <Inbox className="w-10 h-10 md:w-12 md:h-12 text-muted-foreground" />}
      </div>
      <h3 className="text-lg md:text-xl font-semibold mb-2 text-center">
        {title}
      </h3>
      {description && (
        <p className="text-sm md:text-base text-muted-foreground text-center max-w-md mb-2">
          {description}
        </p>
      )}
      {hint && (
        <p className="text-xs text-muted-foreground/70 text-center max-w-sm mb-6">
          {hint}
        </p>
      )}
      {cta && <div className="mt-4">{cta}</div>}
    </motion.div>
  );
}
