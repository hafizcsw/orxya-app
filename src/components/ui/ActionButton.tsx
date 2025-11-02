import { ButtonHTMLAttributes, ReactNode, useState } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>, Omit<ButtonProps, 'onClick'> {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  loadingText?: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function ActionButton({
  onClick,
  loadingText,
  icon,
  children,
  disabled,
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onClick || isLoading || disabled) return;

    try {
      setIsLoading(true);
      await onClick(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      {...props}
      variant={variant}
      size={size}
      disabled={disabled || isLoading}
      onClick={handleClick}
      className={cn(className)}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {loadingText || 'جار المعالجة...'}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </Button>
  );
}
