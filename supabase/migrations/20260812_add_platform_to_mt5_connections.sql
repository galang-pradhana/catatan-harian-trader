-- Migration: 20260812_add_platform_to_mt5_connections.sql
-- Description: Add platform column to mt5_connections to distinguish between MT4 and MT5 connections.

ALTER TABLE public.mt5_connections 
ADD COLUMN IF NOT EXISTS platform VARCHAR(10) DEFAULT 'mt5';

-- Add check constraint to enforce platform values if constraint does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_mt5_platform'
  ) THEN
    ALTER TABLE public.mt5_connections
    ADD CONSTRAINT check_mt5_platform CHECK (platform IN ('mt4', 'mt5'));
  END IF;
END $$;
