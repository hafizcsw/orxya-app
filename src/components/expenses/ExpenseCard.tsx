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
        className="relative p-5 flex items-center gap-4 rounded-2xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] border border-border/50 bg-card/50 hover:border-border hover:bg-card/70"
        style={{
          boxShadow: 'var(--elev-1)',
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
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-base text-card-foreground transition-colors duration-300">
              {category}
            </h3>
            {source === 'bank' && (
              <span className="relative text-xs px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <span className="relative z-10 font-medium text-primary">
                  بنك
                </span>
              </span>
            )}
          </div>
          {note && (
            <p className="text-sm text-muted-foreground truncate transition-colors duration-300">
              {note}
            </p>
          )}
        </div>

        <div className="text-left">
          <div 
            className="text-2xl font-bold transition-all duration-300 mb-1"
            style={{ 
              color: config.color,
              filter: `drop-shadow(${config.glow})`
            }}
          >
            ${amount.toFixed(2)}
          </div>
          <div className="text-xs font-medium text-muted-foreground/80 transition-colors duration-300">
            {format(new Date(date), 'dd MMM', { locale: ar })}
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none shimmer-slide" />
      </div>
    </div>
  );
}
