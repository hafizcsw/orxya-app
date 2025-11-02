import { cn } from "@/lib/utils";

interface BadgeProps {
  label: string;
  variant?: "sleep" | "recovery" | "strain" | "default";
  className?: string;
}

export function Badge({ label, variant = "default", className }: BadgeProps) {
  const variants = {
    sleep: "bg-[hsl(var(--whoop-green)_/_0.15)] text-[hsl(var(--whoop-green))] border-[hsl(var(--whoop-green)_/_0.3)]",
    recovery: "bg-[hsl(var(--whoop-yellow)_/_0.15)] text-[hsl(var(--whoop-yellow))] border-[hsl(var(--whoop-yellow)_/_0.3)]",
    strain: "bg-[hsl(var(--whoop-red)_/_0.15)] text-[hsl(var(--whoop-red))] border-[hsl(var(--whoop-red)_/_0.3)]",
    default: "bg-secondary text-secondary-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border",
        variants[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
