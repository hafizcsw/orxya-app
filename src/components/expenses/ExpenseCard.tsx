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
  
  return (
    <div className="card p-4 flex items-center gap-4 hover:shadow-lg transition-all">
      <CategoryIcon category={categoryKey} size={24} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{category}</h3>
          {source === 'bank' && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              بنك
            </span>
          )}
        </div>
        {note && (
          <p className="text-sm text-muted-foreground truncate mt-1">{note}</p>
        )}
      </div>

      <div className="text-left">
        <div className="text-lg font-bold text-destructive">
          ${amount.toFixed(2)}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(date), 'dd MMM', { locale: ar })}
        </div>
      </div>
    </div>
  );
}
