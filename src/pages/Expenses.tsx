import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AddExpenseDialog } from '@/components/expenses/AddExpenseDialog';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { CATEGORY_CONFIG } from '@/components/expenses/CategoryIcon';
import { DonutChart } from '@/components/charts/DonutChart';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Search, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Expense {
  id: string;
  amount_usd: number;
  category: string;
  note?: string;
  entry_date: string;
  source?: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('month');

  useEffect(() => {
    fetchExpenses();
  }, [dateRange]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('finance_entries')
        .select('*')
        .eq('owner_id', user.id)
        .eq('type', 'spend')
        .order('entry_date', { ascending: false });

      // Apply date range filter
      if (dateRange === 'month') {
        const start = startOfMonth(new Date()).toISOString().split('T')[0];
        const end = endOfMonth(new Date()).toISOString().split('T')[0];
        query = query.gte('entry_date', start).lte('entry_date', end);
      } else if (dateRange === 'week') {
        const start = new Date();
        start.setDate(start.getDate() - 7);
        query = query.gte('entry_date', start.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount_usd), 0);
  const categoryTotals = expenses.reduce((acc, exp) => {
    const cat = exp.category || 'أخرى';
    acc[cat] = (acc[cat] || 0) + Number(exp.amount_usd);
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];
  const dailyAverage = expenses.length > 0 ? totalExpenses / Math.max(new Set(expenses.map(e => e.entry_date)).size, 1) : 0;

  // Chart data
  const chartData = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_CONFIG[name as keyof typeof CATEGORY_CONFIG]?.color || '#888',
  }));

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = !searchQuery || 
      exp.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-accent bg-clip-text text-transparent">
              المصروفات
            </h1>
            <p className="text-muted-foreground mt-2 text-base font-medium">
              {format(new Date(), 'MMMM yyyy', { locale: ar })}
            </p>
          </div>
          <AddExpenseDialog />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 border-destructive/20 bg-card backdrop-blur-sm hover:border-destructive/40 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
                <DollarSign className="text-destructive" size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">إجمالي المصروفات</p>
                <p className="text-3xl font-bold text-card-foreground">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-primary/20 bg-card backdrop-blur-sm hover:border-primary/40 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <TrendingDown className="text-primary" size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">الأكثر إنفاقاً</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {topCategory?.[0] || 'لا يوجد'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-warning/20 bg-card backdrop-blur-sm hover:border-warning/40 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-warning/10 border border-warning/20">
                <Calendar className="text-warning" size={28} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">متوسط يومي</p>
                <p className="text-3xl font-bold text-card-foreground">${dailyAverage.toFixed(2)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        {chartData.length > 0 && (
          <Card className="p-6 bg-card backdrop-blur-sm border-border">
            <h2 className="text-2xl font-bold mb-6 text-card-foreground">توزيع المصروفات</h2>
            <DonutChart data={chartData} height={300} />
          </Card>
        )}

        {/* Filters */}
        <Card className="p-5 bg-card backdrop-blur-sm border-border relative z-10">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60" size={20} />
              <Input
                placeholder="ابحث في المصروفات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-background border-border focus:border-primary text-foreground placeholder:text-muted-foreground/60"
              />
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="كل الفئات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {Object.keys(CATEGORY_CONFIG).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">آخر 7 أيام</SelectItem>
                <SelectItem value="month">هذا الشهر</SelectItem>
                <SelectItem value="all">كل الفترات</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Expenses List */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-card-foreground mb-4">قائمة المصروفات</h2>
          {loading ? (
            <div className="text-center py-16 text-muted-foreground font-medium">
              جاري التحميل...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground font-medium">
              لا توجد مصروفات
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                category={expense.category || 'أخرى'}
                amount={Number(expense.amount_usd)}
                note={expense.note}
                date={expense.entry_date}
                source={expense.source}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
