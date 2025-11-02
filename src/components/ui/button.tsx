import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--btn-shadow)] hover:shadow-[var(--btn-shadow-hover)] hover:scale-[1.02] active:scale-[0.98] hover:brightness-110",
        destructive: "bg-destructive text-destructive-foreground shadow-lg hover:bg-destructive/90 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl",
        outline: "border-2 border-border bg-transparent hover:bg-accent hover:text-accent-foreground hover:border-primary/50 hover:shadow-md",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:scale-[1.01] hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground shadow-lg hover:bg-success/90 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl",
        warning: "bg-warning text-warning-foreground shadow-lg hover:bg-warning/90 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl",
        gradient: "bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground shadow-[var(--btn-shadow)] hover:shadow-[var(--btn-shadow-hover)] hover:scale-[1.02] active:scale-[0.98] hover:from-primary/95 hover:via-primary hover:to-primary/95",
        glass: "backdrop-blur-md bg-card/30 border border-border/50 hover:bg-card/50 hover:border-border shadow-lg hover:shadow-xl",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
