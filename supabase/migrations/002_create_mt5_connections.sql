-- Migration: 002_create_mt5_connections.sql
-- Description: Create mt5_connections table for MetaTrader 5 account tokens and connection state.

CREATE TABLE IF NOT EXISTS public.mt5_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  account_number VARCHAR(64),
  broker_name VARCHAR(128),
  api_token_hash VARCHAR(64) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'connected', 'error'
  last_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_mt5_status CHECK (status IN ('pending', 'connected', 'error'))
);

-- Index for fast token authentication lookup during EA requests
CREATE INDEX IF NOT EXISTS idx_mt5_connections_token_hash ON public.mt5_connections(api_token_hash);
CREATE INDEX IF NOT EXISTS idx_mt5_connections_user_id ON public.mt5_connections(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.mt5_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: User can only manage their own MT5 connections
CREATE POLICY "Users can view own MT5 connections"
  ON public.mt5_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own MT5 connections"
  ON public.mt5_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MT5 connections"
  ON public.mt5_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own MT5 connections"
  ON public.mt5_connections FOR DELETE
  USING (auth.uid() = user_id);
