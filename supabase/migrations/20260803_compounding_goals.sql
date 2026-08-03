-- Migration: Compounding Plans, Levels, and Goals
-- Date: 2026-08-03

-- 1. Add current_balance to mt5_connections table
ALTER TABLE public.mt5_connections
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(15, 2) NULL,
ADD COLUMN IF NOT EXISTS balance_updated_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Create compounding_plans table
CREATE TABLE IF NOT EXISTS public.compounding_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    mt5_connection_id UUID REFERENCES public.mt5_connections(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    initial_modal DECIMAL(15, 2) NOT NULL,
    is_manual_modal BOOLEAN DEFAULT false,
    profit_plan_percent DECIMAL(5, 2) NOT NULL,
    risk_plan_percent DECIMAL(5, 2) NOT NULL,
    pip_risk DECIMAL(10, 2) NOT NULL,
    pip_value_per_lot DECIMAL(10, 2) DEFAULT 10.00,
    goal_level_target INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create compounding_levels table
CREATE TABLE IF NOT EXISTS public.compounding_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES public.compounding_plans(id) ON DELETE CASCADE,
    level_number INTEGER NOT NULL,
    target_plan DECIMAL(15, 2) NOT NULL,
    asset_plan DECIMAL(15, 2) NOT NULL,
    ideal_lot DECIMAL(10, 2) NOT NULL,
    risk_amount DECIMAL(15, 2) NOT NULL,
    is_achieved BOOLEAN DEFAULT false,
    achieved_at TIMESTAMP WITH TIME ZONE NULL,
    UNIQUE(plan_id, level_number)
);

-- 4. Create goals table (Auto-sync with Compounding Plans)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'manual', -- 'manual' / 'compounding_level'
    target_value DECIMAL(15, 2) NULL,
    current_progress DECIMAL(5, 2) DEFAULT 0.00, -- 0 to 100%
    deadline DATE NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active' / 'achieved' / 'expired' / 'cancelled'
    source_plan_id UUID REFERENCES public.compounding_plans(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.compounding_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compounding_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own compounding plans"
ON public.compounding_plans FOR ALL TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage compounding levels of their plans"
ON public.compounding_levels FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.compounding_plans
        WHERE compounding_plans.id = compounding_levels.plan_id
        AND compounding_plans.user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their own goals"
ON public.goals FOR ALL TO authenticated
USING (auth.uid() = user_id);
