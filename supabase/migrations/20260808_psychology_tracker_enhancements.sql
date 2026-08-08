-- Migration: Psychology Tracker & Mood Analytics Enhancements
-- Date: 2026-08-08

-- 1. Create table for Custom Trigger Tags
CREATE TABLE IF NOT EXISTS public.psychology_trigger_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.psychology_trigger_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trigger tags"
  ON public.psychology_trigger_tags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. Create table for Daily Psychology Logs
CREATE TABLE IF NOT EXISTS public.daily_psychology_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL, -- 'YYYY-MM-DD'
  emotion         VARCHAR(50) NOT NULL,
  category        VARCHAR(50) NOT NULL,
  trigger_tags    TEXT[] DEFAULT '{}',
  reflection_note TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, log_date)
);

ALTER TABLE public.daily_psychology_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own daily psychology logs"
  ON public.daily_psychology_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_daily_psychology_logs_user_date
  ON public.daily_psychology_logs(user_id, log_date DESC);
