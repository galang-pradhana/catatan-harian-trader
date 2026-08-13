-- Migration: 20260813_add_manual_platform_support.sql
-- Description: Support 'manual' platform in mt5_connections and make account_number, api_token_hash, broker_name nullable for manual entries.

-- 1. Drop existing platform check constraint if present and recreate with 'manual' option
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_mt5_platform'
  ) THEN
    ALTER TABLE public.mt5_connections DROP CONSTRAINT check_mt5_platform;
  END IF;
  
  ALTER TABLE public.mt5_connections
  ADD CONSTRAINT check_mt5_platform CHECK (platform IN ('mt4', 'mt5', 'manual'));
END $$;

-- 2. Make account_number, api_token_hash, and broker_name nullable for manual connections
ALTER TABLE public.mt5_connections ALTER COLUMN account_number DROP NOT NULL;
ALTER TABLE public.mt5_connections ALTER COLUMN api_token_hash DROP NOT NULL;
ALTER TABLE public.mt5_connections ALTER COLUMN broker_name DROP NOT NULL;
