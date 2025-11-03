import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CategoryIcon, CATEGORY_CONFIG } from './CategoryIcon';

interface ExpenseCardProps {
  category: string;
  amount: number;
  note?: string;
  date: string;
  source?: string;
}

export function ExpenseCard({ category, amount, note, date, source }: ExpenseCardProps) {
  const categoryKey = category as keyof typeof CATEGORY_CONFIG;
  const config = CATEGORY_CONFIG[categoryKey] || CATEGORY_CONFIG['أخرى'];
  
  return (
    <div className="group relative overflow-hidden">
      {/* Glass card with futuristic effects */}
      <div 
        className="relative p-4 flex items-center gap-4 rounded-2xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] border"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Gradient glow on hover */}
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none"
          style={{ background: config.gradient }}
        />
        
        {/* Category Icon with glass variant */}
        <CategoryIcon category={categoryKey} size={28} variant="glass" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
              {category}
            </h3>
            {source === 'bank' && (
              <span className="relative text-xs px-3 py-1 rounded-full overflow-hidden backdrop-blur-sm border border-primary/20">
                <span className="relative z-10 font-medium" style={{ color: config.color }}>
                  بنك
                </span>
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{ background: config.gradient }}
                />
              </span>
            )}
          </div>
          {note && (
            <p className="text-sm text-muted-foreground truncate mt-1 transition-colors duration-300 group-hover:text-foreground">
              {note}
            </p>
          )}
        </div>

        <div className="text-left">
          <div 
            className="text-xl font-bold transition-all duration-300"
            style={{ 
              color: config.color,
              textShadow: `0 0 10px ${config.color}40`
            }}
          >
            ${amount.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
            {format(new Date(date), 'dd MMM', { locale: ar })}
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none shimmer-slide" />
      </div>
    </div>
  );
}
