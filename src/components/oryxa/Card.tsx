import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface OryxaCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function OryxaCard({ children, className, onClick }: OryxaCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card rounded-2xl p-5 border border-border/50",
        "backdrop-blur-sm",
        onClick && "cursor-pointer hover:bg-accent/50 transition-colors",
        className
      )}
    >
      {children}
    </div>
  );
}
