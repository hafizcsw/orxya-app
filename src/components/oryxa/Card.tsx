import * as React from "react";
import { cn } from "@/lib/utils";

interface OryxaCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "gradient";
}

const OryxaCard = React.forwardRef<HTMLDivElement, OryxaCardProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-[hsl(var(--surface))] border border-[hsl(var(--border))]",
      glass: "bg-[hsl(var(--surface))]/80 backdrop-blur-xl border border-[hsl(var(--border))]/50",
      gradient: "bg-gradient-surface border border-[hsl(var(--border))]",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-card shadow-soft transition-all duration-base hover:shadow-strong",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
OryxaCard.displayName = "OryxaCard";

const OryxaCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);
OryxaCardHeader.displayName = "OryxaCardHeader";

const OryxaCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl font-bold leading-none tracking-tight text-[hsl(var(--text))]", className)}
      {...props}
    />
  )
);
OryxaCardTitle.displayName = "OryxaCardTitle";

const OryxaCardSubtitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-[hsl(var(--text-muted))]", className)}
      {...props}
    />
  )
);
OryxaCardSubtitle.displayName = "OryxaCardSubtitle";

const OryxaCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
OryxaCardContent.displayName = "OryxaCardContent";

const OryxaCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center gap-2 p-6 pt-0", className)}
      {...props}
    />
  )
);
OryxaCardFooter.displayName = "OryxaCardFooter";

export {
  OryxaCard,
  OryxaCardHeader,
  OryxaCardTitle,
  OryxaCardSubtitle,
  OryxaCardContent,
  OryxaCardFooter,
};
