-- Add initial balance field to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS initial_balance_usd NUMERIC DEFAULT 0;