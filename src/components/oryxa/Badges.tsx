import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Calendar, Sparkles, Zap } from "lucide-react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "overdue" | "today" | "ai" | "auto" | "default";
  icon?: boolean;
}

const OryxaBadge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", icon = true, children, ...props }, ref) => {
    const variants = {
      overdue: {
        className: "bg-[hsl(var(--danger-bg))] text-[hsl(var(--danger))] border-[hsl(var(--danger))]/30",
        icon: <AlertCircle className="h-3 w-3" />,
      },
      today: {
        className: "bg-[hsl(var(--info-bg))] text-[hsl(var(--info))] border-[hsl(var(--info))]/30",
        icon: <Calendar className="h-3 w-3" />,
      },
      ai: {
        className: "bg-[hsl(var(--brand-500))]/10 text-[hsl(var(--brand-500))] border-[hsl(var(--brand-500))]/30",
        icon: <Sparkles className="h-3 w-3" />,
      },
      auto: {
        className: "bg-[hsl(var(--success-bg))] text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
        icon: <Zap className="h-3 w-3" />,
      },
      default: {
        className: "bg-[hsl(var(--muted))] text-[hsl(var(--text-muted))] border-[hsl(var(--border))]",
        icon: null,
      },
    };

    const variantConfig = variants[variant];

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-medium border transition-all duration-base",
          variantConfig.className,
          className
        )}
        {...props}
      >
        {icon && variantConfig.icon}
        {children}
      </div>
    );
  }
);
OryxaBadge.displayName = "OryxaBadge";

export { OryxaBadge };
