import { 
  UtensilsCrossed, Car, Wrench, Heart, 
  GraduationCap, Gamepad2, ShoppingBag, FileText,
  Home, TrendingUp, HelpCircle
} from 'lucide-react';

const CATEGORY_CONFIG = {
  'طعام': { icon: UtensilsCrossed, color: 'hsl(0 84% 60%)' },
  'مواصلات': { icon: Car, color: 'hsl(187 64% 58%)' },
  'خدمات': { icon: Wrench, color: 'hsl(158 61% 71%)' },
  'صحة': { icon: Heart, color: 'hsl(0 76% 73%)' },
  'تعليم': { icon: GraduationCap, color: 'hsl(256 52% 73%)' },
  'ترفيه': { icon: Gamepad2, color: 'hsl(328 73% 84%)' },
  'تسوق': { icon: ShoppingBag, color: 'hsl(48 100% 62%)' },
  'فواتير': { icon: FileText, color: 'hsl(134 61% 58%)' },
  'إيجار': { icon: Home, color: 'hsl(218 100% 66%)' },
  'استثمار': { icon: TrendingUp, color: 'hsl(246 59% 76%)' },
  'أخرى': { icon: HelpCircle, color: 'hsl(var(--muted-foreground))' },
} as const;

interface CategoryIconProps {
  category: keyof typeof CATEGORY_CONFIG;
  size?: number;
  className?: string;
}

export function CategoryIcon({ category, size = 20, className = '' }: CategoryIconProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['أخرى'];
  const Icon = config.icon;

  return (
    <div 
      className={`rounded-full p-2 flex items-center justify-center ${className}`}
      style={{ 
        backgroundColor: `${config.color}20`,
        color: config.color 
      }}
    >
      <Icon size={size} />
    </div>
  );
}

export { CATEGORY_CONFIG };
