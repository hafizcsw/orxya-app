import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type GoalType = 
  | 'work_hours' 
  | 'study_hours' 
  | 'mma_hours' 
  | 'walk_km' 
  | 'income_monthly' 
  | 'expenses_daily';

export interface UserGoal {
  id: string;
  goal_type: GoalType;
  target_value: number;
  period: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
}

export const DEFAULT_GOALS: Record<GoalType, number> = {
  work_hours: 8,
  study_hours: 2,
  mma_hours: 1,
  walk_km: 10, // 10 km or 10,000 steps
  income_monthly: 10000,
  expenses_daily: 100,
};

export function useUserGoals() {
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('is_active', true);

      if (!error && data) {
        setGoals(data as UserGoal[]);
      }
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGoal = (goalType: GoalType): number => {
    const goal = goals.find(g => g.goal_type === goalType);
    return goal?.target_value || DEFAULT_GOALS[goalType];
  };

  const updateGoal = async (goalType: GoalType, targetValue: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_goals')
        .upsert({
          owner_id: user.id,
          goal_type: goalType,
          target_value: targetValue,
          period: 'daily',
          is_active: true,
        }, {
          onConflict: 'owner_id,goal_type,period'
        });

      if (!error) {
        await fetchGoals();
      }
    } catch (err) {
      console.error('Error updating goal:', err);
    }
  };

  return { goals, loading, getGoal, updateGoal, refetch: fetchGoals };
}
