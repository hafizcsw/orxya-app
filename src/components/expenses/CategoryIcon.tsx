import { 
  UtensilsCrossed, Car, Wrench, Heart, 
  GraduationCap, Gamepad2, ShoppingBag, FileText,
  Home, TrendingUp, HelpCircle
} from 'lucide-react';

const CATEGORY_CONFIG = {
  'طعام': { 
    icon: UtensilsCrossed, 
    color: 'hsl(0 84% 60%)',
    gradient: 'linear-gradient(135deg, hsl(0 84% 60%), hsl(15 90% 55%))',
    glow: '0 0 20px hsl(0 84% 60% / 0.5)'
  },
  'مواصلات': { 
    icon: Car, 
    color: 'hsl(187 64% 58%)',
    gradient: 'linear-gradient(135deg, hsl(187 64% 58%), hsl(200 70% 50%))',
    glow: '0 0 20px hsl(187 64% 58% / 0.5)'
  },
  'خدمات': { 
    icon: Wrench, 
    color: 'hsl(158 61% 71%)',
    gradient: 'linear-gradient(135deg, hsl(158 61% 71%), hsl(170 65% 60%))',
    glow: '0 0 20px hsl(158 61% 71% / 0.5)'
  },
  'صحة': { 
    icon: Heart, 
    color: 'hsl(0 76% 73%)',
    gradient: 'linear-gradient(135deg, hsl(0 76% 73%), hsl(340 80% 65%))',
    glow: '0 0 20px hsl(0 76% 73% / 0.5)'
  },
  'تعليم': { 
    icon: GraduationCap, 
    color: 'hsl(256 52% 73%)',
    gradient: 'linear-gradient(135deg, hsl(256 52% 73%), hsl(270 60% 65%))',
    glow: '0 0 20px hsl(256 52% 73% / 0.5)'
  },
  'ترفيه': { 
    icon: Gamepad2, 
    color: 'hsl(328 73% 84%)',
    gradient: 'linear-gradient(135deg, hsl(328 73% 84%), hsl(340 80% 75%))',
    glow: '0 0 20px hsl(328 73% 84% / 0.5)'
  },
  'تسوق': { 
    icon: ShoppingBag, 
    color: 'hsl(48 100% 62%)',
    gradient: 'linear-gradient(135deg, hsl(48 100% 62%), hsl(38 92% 50%))',
    glow: '0 0 20px hsl(48 100% 62% / 0.5)'
  },
  'فواتير': { 
    icon: FileText, 
    color: 'hsl(134 61% 58%)',
    gradient: 'linear-gradient(135deg, hsl(134 61% 58%), hsl(142 76% 46%))',
    glow: '0 0 20px hsl(134 61% 58% / 0.5)'
  },
  'إيجار': { 
    icon: Home, 
    color: 'hsl(218 100% 66%)',
    gradient: 'linear-gradient(135deg, hsl(218 100% 66%), hsl(217 100% 50%))',
    glow: '0 0 20px hsl(218 100% 66% / 0.5)'
  },
  'استثمار': { 
    icon: TrendingUp, 
    color: 'hsl(246 59% 76%)',
    gradient: 'linear-gradient(135deg, hsl(246 59% 76%), hsl(256 65% 65%))',
    glow: '0 0 20px hsl(246 59% 76% / 0.5)'
  },
  'أخرى': { 
    icon: HelpCircle, 
    color: 'hsl(var(--muted-foreground))',
    gradient: 'linear-gradient(135deg, hsl(var(--muted-foreground)), hsl(var(--muted)))',
    glow: '0 0 20px hsl(var(--muted-foreground) / 0.3)'
  },
} as const;

interface CategoryIconProps {
  category: keyof typeof CATEGORY_CONFIG;
  size?: number;
  className?: string;
  variant?: 'default' | 'glass' | 'neon';
}

export function CategoryIcon({ 
  category, 
  size = 20, 
  className = '',
  variant = 'glass' 
}: CategoryIconProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['أخرى'];
  const Icon = config.icon;

  if (variant === 'neon') {
    return (
      <div 
        className={`relative rounded-2xl p-3 flex items-center justify-center transition-all duration-500 hover:scale-110 group ${className}`}
        style={{ 
          background: `${config.color}10`,
          border: `1px solid ${config.color}40`,
          boxShadow: config.glow
        }}
      >
        {/* Animated glow background */}
        <div 
          className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
          style={{ 
            background: config.gradient,
          }}
        />
        
        {/* Main icon */}
        <div className="relative z-10">
          <Icon 
            size={size} 
            style={{ 
              color: config.color,
              filter: `drop-shadow(${config.glow})`,
            }}
            className="transition-all duration-300 group-hover:scale-110"
          />
        </div>
      </div>
    );
  }

  if (variant === 'glass') {
    return (
      <div 
        className={`relative rounded-2xl p-3 flex items-center justify-center backdrop-blur-xl transition-all duration-500 hover:scale-110 hover:rotate-3 group overflow-hidden ${className}`}
        style={{ 
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Gradient overlay on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
          style={{ 
            background: config.gradient,
          }}
        />
        
        {/* Shine effect */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{
            background: 'linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
            transform: 'translateX(-100%)',
            animation: 'shimmer-slide 2s infinite'
          }}
        />
        
        <div className="relative z-10">
          <Icon 
            size={size} 
            style={{ color: config.color }}
            className="transition-all duration-300"
          />
        </div>
      </div>
    );
  }

  // Default variant
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
