export interface BusinessPlan {
  plan_id: string;
  owner_id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  category: 'business' | 'investment' | 'real-estate' | 'education';
  target_monthly?: number;
  description?: string;
  order_pos: number;
  
  // Statistics from v_plan_performance view
  today_profit: number;
  week_profit: number;
  month_profit: number;
  month_qty: number;
  month_transactions: number;
  year_profit: number;
}

export interface BusinessPlanFormData {
  name: string;
  slug?: string;
  icon?: string;
  color?: string;
  category?: 'business' | 'investment' | 'real-estate' | 'education';
  target_monthly?: number;
  description?: string;
}