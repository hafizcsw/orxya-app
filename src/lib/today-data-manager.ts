import { supabase } from '@/integrations/supabase/client';

export interface TodayData {
  currentTask: any | null;
  nextTask: any | null;
  todayTasks: any[];
  activities: {
    work: ActivityMetric;
    study: ActivityMetric;
    mma: ActivityMetric;
    sleep: ActivityMetric;
  };
  health: {
    recovery: number;
    strain: number;
    sleep: number;
    hrv: number;
  };
  financial: {
    income: number;
    expenses: number;
    balance: number;
    trends: {
      income: TrendData;
      expenses: TrendData;
      balance: TrendData;
    };
  };
}

export interface ActivityMetric {
  actual: number;
  goal: number;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  trend: TrendData;
}

export interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
}

export interface AIInsights {
  focusScore: number;
  energyLevel: 'low' | 'medium' | 'high';
  suggestions: string[];
  warnings: string[];
}

type CacheEntry = {
  data: any;
  timestamp: number;
};

class TodayDataManagerClass {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data or fetch new data
   */
  private async getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    cacheDuration: number = this.CACHE_DURATION
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheDuration) {
      return cached.data as T;
    }

    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  /**
   * Clear cache for a specific key or all cache
   */
  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Fetch all today data from edge function
   */
  async fetchTodayData(date?: Date): Promise<TodayData> {
    const dateStr = date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const cacheKey = `today-data-${dateStr}`;

    const fetchData = async (): Promise<TodayData> => {
      const { data, error } = await supabase.functions.invoke('today-realtime-data', {
        body: { date: dateStr }
      });

      if (error) {
        console.error('Error fetching today data:', error);
        throw error;
      }

      return data as TodayData;
    };

    return this.getCached(cacheKey, fetchData);
  }

  /**
   * Fetch AI insights with enhanced context
   */
  async fetchAIInsights(
    currentTask: any,
    health: any,
    activities: any,
    upcomingEvents: any[]
  ): Promise<AIInsights> {
    const now = new Date();
    const hour = now.getHours();
    const cacheKey = `ai-insights-${now.toISOString().split('T')[0]}-${hour}`;

    const fetchInsights = async (): Promise<AIInsights> => {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('User not authenticated, returning default insights');
        return {
          focusScore: 50,
          energyLevel: 'medium',
          suggestions: ['قم بتسجيل الدخول للحصول على رؤى مخصصة'],
          warnings: []
        };
      }

      // Get user goals for context
      let goals: any[] = [];
      try {
        // @ts-ignore - Supabase type inference issue
        const { data } = await supabase.from('user_goals').select('*').eq('active', true);
        goals = data || [];
      } catch (e) {
        console.error('Error fetching goals:', e);
      }

      // Get recent trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let recentActivities: any[] = [];
      try {
        // @ts-ignore - Supabase type inference issue
        const { data } = await supabase.from('vw_today_activities').select('*').gte('day', sevenDaysAgo.toISOString().split('T')[0]).order('day', { ascending: false }).limit(7);
        recentActivities = data || [];
      } catch (e) {
        console.error('Error fetching activities:', e);
      }

      // Enhanced context
      const enhancedContext = {
        currentTask,
        health,
        activities,
        upcomingEvents: upcomingEvents?.slice(0, 5) || [],
        timeOfDay: this.getTimeOfDay(hour),
        dayOfWeek: now.getDay(),
        userGoals: goals || [],
        recentTrends: this.calculateRecentTrends(recentActivities || [])
      };

      const { data, error } = await supabase.functions.invoke('today-ai-insights', {
        body: enhancedContext
      });

      if (error) {
        console.error('Error fetching AI insights:', error);
        return {
          focusScore: 50,
          energyLevel: 'medium',
          suggestions: [],
          warnings: []
        };
      }

      return data as AIInsights;
    };

    return this.getCached(cacheKey, fetchInsights, 60 * 60 * 1000);
  }

  /**
   * Get time of day category
   */
  private getTimeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Calculate trends from recent activities
   */
  private calculateRecentTrends(activities: any[]) {
    if (activities.length === 0) return null;

    const avgWork = activities.reduce((sum, a) => sum + (a.work_hours || 0), 0) / activities.length;
    const avgStudy = activities.reduce((sum, a) => sum + (a.study_hours || 0), 0) / activities.length;
    const avgSports = activities.reduce((sum, a) => sum + (a.sports_hours || 0), 0) / activities.length;

    return {
      avgWorkHours: Math.round(avgWork * 10) / 10,
      avgStudyHours: Math.round(avgStudy * 10) / 10,
      avgSportsHours: Math.round(avgSports * 10) / 10,
      totalDays: activities.length
    };
  }

  /**
   * Get financial data from financial_events table
   */
  async fetchFinancialData(date: Date) {
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `financial-${dateStr}`;

    const fetchData = async () => {
      // Get today's financial events
      const { data: events } = await supabase
        .from('financial_events')
        .select('*')
        .gte('when_at', dateStr + 'T00:00:00Z')
        .lt('when_at', dateStr + 'T23:59:59Z')
        .order('when_at', { ascending: false });

      const income = events?.reduce((sum, e) => e.direction === 1 ? sum + Number(e.amount) : sum, 0) || 0;
      const expenses = events?.reduce((sum, e) => e.direction === -1 ? sum + Number(e.amount) : sum, 0) || 0;

      // Get previous day for trends
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 1);
      const prevDateStr = prevDate.toISOString().split('T')[0];

      const { data: prevEvents } = await supabase
        .from('financial_events')
        .select('*')
        .gte('when_at', prevDateStr + 'T00:00:00Z')
        .lt('when_at', prevDateStr + 'T23:59:59Z');

      const prevIncome = prevEvents?.reduce((sum, e) => e.direction === 1 ? sum + Number(e.amount) : sum, 0) || 0;
      const prevExpenses = prevEvents?.reduce((sum, e) => e.direction === -1 ? sum + Number(e.amount) : sum, 0) || 0;

      const balance = income - expenses;
      const prevBalance = prevIncome - prevExpenses;

      const calculateTrend = (current: number, previous: number): TrendData => {
        if (!previous || previous === 0) return { direction: 'neutral', percentage: 0 };
        const change = ((current - previous) / previous) * 100;
        return {
          direction: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral',
          percentage: Math.abs(Math.round(change))
        };
      };

      return {
        income,
        expenses,
        balance,
        trends: {
          income: calculateTrend(income, prevIncome),
          expenses: calculateTrend(expenses, prevExpenses),
          balance: calculateTrend(balance, prevBalance)
        }
      };
    };

    return this.getCached(cacheKey, fetchData);
  }
}

export const TodayDataManager = new TodayDataManagerClass();
