import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: any;
  variant?: Variant;
  size?: Size;
}

export default function Button({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const base = "btn inline-flex items-center justify-center rounded-2xl border transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-1 text-sm" : "px-4 py-2";
  const variants = {
    primary: "bg-primary text-primary-foreground border-transparent hover:opacity-95",
    secondary: "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80",
    ghost: "bg-transparent text-foreground border-transparent hover:bg-muted/60",
    destructive: "bg-red-600 text-white border-transparent hover:bg-red-700",
  }[variant];
  
  return <Comp className={clsx(base, sizes, variants, className)} {...props} />;
}
