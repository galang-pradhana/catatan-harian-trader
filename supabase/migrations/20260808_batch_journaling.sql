-- Migration: Add Batch Journaling Group Support
-- Date: 2026-08-08

ALTER TABLE public.trade_journal
ADD COLUMN IF NOT EXISTS group_id VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS group_name VARCHAR(255) NULL;

CREATE INDEX IF NOT EXISTS idx_trade_journal_group_id
ON public.trade_journal(group_id);
