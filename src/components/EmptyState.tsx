import { motion } from 'framer-motion';

export default function EmptyState({
  title,
  hint,
  cta,
}: {
  title: string;
  hint?: string;
  cta?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="border border-dashed rounded-2xl p-8 text-center bg-muted/40"
    >
      <div className="text-lg font-medium mb-1">{title}</div>
      {hint && <div className="text-sm text-muted-foreground mb-4">{hint}</div>}
      {cta}
    </motion.div>
  );
}
