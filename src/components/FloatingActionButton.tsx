import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

export function FloatingActionButton({ 
  icon: Icon, 
  onClick, 
  className,
  ariaLabel 
}: FloatingActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "fixed bottom-24 left-6 z-30",
        "w-14 h-14 rounded-full",
        "bg-primary text-primary-foreground",
        "flex items-center justify-center",
        "shadow-lg hover:shadow-xl",
        "transition-shadow duration-300",
        className
      )}
      style={{
        boxShadow: "0 0 20px hsl(var(--primary) / 0.4)",
      }}
    >
      <Icon className="w-6 h-6" />
    </motion.button>
  );
}
