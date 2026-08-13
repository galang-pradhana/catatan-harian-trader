-- Migration: 20260813_patch_1_4_settings_completion.sql
-- Description: Add settings columns to users table and create user_sessions, notification_preferences, data_export_requests tables.

-- 1. Add new columns to public.users table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'timezone') THEN
    ALTER TABLE public.users ADD COLUMN timezone VARCHAR DEFAULT 'Asia/Jakarta';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
    ALTER TABLE public.users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'dashboard_default_period') THEN
    ALTER TABLE public.users ADD COLUMN dashboard_default_period VARCHAR DEFAULT 'month';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'number_format') THEN
    ALTER TABLE public.users ADD COLUMN number_format VARCHAR DEFAULT 'en';
  END IF;
END $$;

-- 2. Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_info VARCHAR NOT NULL,
  ip_address VARCHAR DEFAULT '127.0.0.1',
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 3. Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  channel_email BOOLEAN DEFAULT true,
  channel_push BOOLEAN DEFAULT false,
  channel_telegram BOOLEAN DEFAULT false,
  alert_sync_error BOOLEAN DEFAULT true,
  alert_order_execution BOOLEAN DEFAULT true,
  alert_compounding_goal BOOLEAN DEFAULT true,
  alert_journal_reminder BOOLEAN DEFAULT true,
  alert_ai_analysis_done BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/update own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- 4. Create data_export_requests table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status VARCHAR DEFAULT 'ready',
  file_name VARCHAR,
  file_url VARCHAR,
  requested_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export requests" ON public.data_export_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own export requests" ON public.data_export_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
