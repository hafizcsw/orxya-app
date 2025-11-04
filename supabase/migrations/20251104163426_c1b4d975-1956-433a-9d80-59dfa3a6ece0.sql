-- Phase 1: Business Plans Management System Database Schema

-- 1. Create business_plans table
CREATE TABLE IF NOT EXISTS public.business_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  icon TEXT DEFAULT 'DollarSign',
  color TEXT DEFAULT 'hsl(142, 76%, 36%)',
  category TEXT DEFAULT 'business',
  target_monthly NUMERIC(12,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  order_pos INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT business_plans_owner_slug_unique UNIQUE(owner_id, slug)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_plans_owner ON public.business_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_business_plans_active ON public.business_plans(owner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_business_plans_order ON public.business_plans(owner_id, order_pos);

-- 3. Add plan_id to sales table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sales' 
                 AND column_name = 'plan_id') THEN
    ALTER TABLE public.sales ADD COLUMN plan_id UUID REFERENCES public.business_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'sales' 
                 AND column_name = 'plan_slug') THEN
    ALTER TABLE public.sales ADD COLUMN plan_slug TEXT;
  END IF;
END $$;

-- 4. Create index for sales plan queries
CREATE INDEX IF NOT EXISTS idx_sales_plan ON public.sales(plan_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_plan_slug ON public.sales(plan_slug, sale_date);

-- 5. Create view for plan performance analytics
CREATE OR REPLACE VIEW public.v_plan_performance AS
SELECT 
  bp.id as plan_id,
  bp.owner_id,
  bp.name,
  bp.slug,
  bp.icon,
  bp.color,
  bp.category,
  bp.target_monthly,
  bp.description,
  bp.order_pos,
  COALESCE(SUM(s.profit_usd) FILTER (WHERE s.sale_date >= CURRENT_DATE), 0) as today_profit,
  COALESCE(SUM(s.profit_usd) FILTER (WHERE s.sale_date >= date_trunc('week', CURRENT_DATE)), 0) as week_profit,
  COALESCE(SUM(s.profit_usd) FILTER (WHERE s.sale_date >= date_trunc('month', CURRENT_DATE)), 0) as month_profit,
  COALESCE(SUM(s.qty) FILTER (WHERE s.sale_date >= date_trunc('month', CURRENT_DATE)), 0) as month_qty,
  COALESCE(COUNT(s.id) FILTER (WHERE s.sale_date >= date_trunc('month', CURRENT_DATE)), 0) as month_transactions,
  COALESCE(SUM(s.profit_usd) FILTER (WHERE s.sale_date >= date_trunc('year', CURRENT_DATE)), 0) as year_profit
FROM public.business_plans bp
LEFT JOIN public.sales s ON s.plan_id = bp.id
WHERE bp.is_active = true
GROUP BY bp.id;

-- 6. Enable RLS on business_plans
ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for business_plans
CREATE POLICY "Users can view their own plans"
ON public.business_plans FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own plans"
ON public.business_plans FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own plans"
ON public.business_plans FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their own plans"
ON public.business_plans FOR DELETE
USING (owner_id = auth.uid());

-- 8. Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_business_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_plans_updated_at ON public.business_plans;
CREATE TRIGGER trg_business_plans_updated_at
  BEFORE UPDATE ON public.business_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_plans_updated_at();

-- 9. Insert default plans for existing users (migration helper)
-- This will create 3 default plans for users who have sales data
INSERT INTO public.business_plans (owner_id, name, slug, icon, color, category, order_pos)
SELECT DISTINCT 
  owner_id,
  'منح دراسية' as name,
  'scholarship' as slug,
  'Award' as icon,
  'hsl(142, 76%, 36%)' as color,
  'education' as category,
  1 as order_pos
FROM public.sales
WHERE owner_id IS NOT NULL
ON CONFLICT (owner_id, slug) DO NOTHING;

INSERT INTO public.business_plans (owner_id, name, slug, icon, color, category, order_pos)
SELECT DISTINCT 
  owner_id,
  'فلل' as name,
  'villa' as slug,
  'Building' as icon,
  'hsl(221, 83%, 53%)' as color,
  'real-estate' as category,
  2 as order_pos
FROM public.sales
WHERE owner_id IS NOT NULL
ON CONFLICT (owner_id, slug) DO NOTHING;

INSERT INTO public.business_plans (owner_id, name, slug, icon, color, category, order_pos)
SELECT DISTINCT 
  owner_id,
  'أخرى' as name,
  'other' as slug,
  'DollarSign' as icon,
  'hsl(48, 96%, 53%)' as color,
  'business' as category,
  3 as order_pos
FROM public.sales
WHERE owner_id IS NOT NULL
ON CONFLICT (owner_id, slug) DO NOTHING;

-- 10. Update existing sales records to link with plans
UPDATE public.sales s
SET plan_id = bp.id,
    plan_slug = bp.slug
FROM public.business_plans bp
WHERE s.owner_id = bp.owner_id
  AND s.type = bp.slug
  AND s.plan_id IS NULL;