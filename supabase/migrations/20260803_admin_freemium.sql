-- Migration: Admin Panel & Freemium Fields
-- Date: 2026-08-03

-- 1. Add Freemium & Admin columns to users table (if not exist)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user',
ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE NULL;

-- Backfill email from auth.users for existing users
UPDATE public.users u
SET email = a.email
FROM auth.users a
WHERE u.id = a.id AND (u.email IS NULL OR u.email = '');

-- Auto-sync trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_email_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, role, plan, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'user',
    'free',
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_sync_email ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_email
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_email_sync();

-- Index for admin user queries
CREATE INDEX IF NOT EXISTS idx_users_role_status ON public.users(role, status);

-- 2. Create Admin Audit Log Table (Append-only)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies for admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);

-- Only Admins can insert audit logs (no UPDATE or DELETE policies allowed for immutability)
CREATE POLICY "Admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid() AND users.role = 'admin'
    )
);
