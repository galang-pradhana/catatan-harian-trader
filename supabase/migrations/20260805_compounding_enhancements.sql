-- Migration: Compounding Enhancements (Rules/Notes, Active/Archive status, Manual Override)
-- Date: 2026-08-05

-- 1. Add rules_notes, is_active, is_archived to compounding_plans table
ALTER TABLE public.compounding_plans
ADD COLUMN IF NOT EXISTS rules_notes TEXT NULL,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Add manual_override to compounding_levels table
ALTER TABLE public.compounding_levels
ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT false;

-- Index for fast user compounding plan lookups
CREATE INDEX IF NOT EXISTS idx_compounding_plans_user_active
ON public.compounding_plans(user_id, is_active, is_archived);
