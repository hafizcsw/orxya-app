import { motion } from 'framer-motion';
import { HolographicCard } from '@/components/ui/HolographicCard';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title,
  hint,
  cta,
  icon,
}: {
  title: string;
  hint?: string;
  cta?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <HolographicCard variant="glass" className="p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {icon || <Inbox className="w-8 h-8 text-muted-foreground" />}
          </div>
          <div className="text-lg font-semibold">{title}</div>
          {hint && <div className="text-sm text-muted-foreground max-w-md">{hint}</div>}
          {cta && <div className="mt-4">{cta}</div>}
        </div>
      </HolographicCard>
    </motion.div>
  );
}
