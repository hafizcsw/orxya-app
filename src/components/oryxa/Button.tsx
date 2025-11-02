import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const oryxaButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-gradient-primary text-white shadow-soft hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]",
        secondary: "bg-[hsl(var(--surface-raised))] text-[hsl(var(--text))] border border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] shadow-soft",
        ghost: "text-[hsl(var(--text-muted))] hover:bg-[hsl(var(--surface-raised))] hover:text-[hsl(var(--text))]",
        destructive: "bg-[hsl(var(--danger))] text-white shadow-soft hover:bg-[hsl(var(--danger))]/90",
        success: "bg-[hsl(var(--success))] text-white shadow-soft hover:bg-[hsl(var(--success))]/90",
        warning: "bg-[hsl(var(--warning))] text-white shadow-soft hover:bg-[hsl(var(--warning))]/90",
        link: "text-[hsl(var(--brand-500))] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-button",
        md: "h-10 px-4 text-sm rounded-pill",
        lg: "h-12 px-6 text-base rounded-pill",
        icon: "h-10 w-10 rounded-pill",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface OryxaButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof oryxaButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const OryxaButton = React.forwardRef<HTMLButtonElement, OryxaButtonProps>(
  ({ className, variant, size, asChild = false, loading, icon, iconPosition = "left", children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(oryxaButtonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && iconPosition === "left" && icon}
        {children}
        {!loading && icon && iconPosition === "right" && icon}
      </Comp>
    );
  }
);
OryxaButton.displayName = "OryxaButton";

export { OryxaButton, oryxaButtonVariants };
