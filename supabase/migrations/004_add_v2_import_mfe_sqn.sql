-- ============================================================
-- Migration 004: Addendum V2 — CSV Import & MFE / SQN Metrics
-- ============================================================

-- ─── 1. ALTER TRADES TABLE ───────────────────────────────────
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'mt5_sync' CHECK (source IN ('mt5_sync', 'csv_import', 'manual')),
  ADD COLUMN IF NOT EXISTS mfe_value DECIMAL(18, 5),
  ADD COLUMN IF NOT EXISTS mfe_percent DECIMAL(5, 2);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_trades_source ON public.trades(source);

-- ─── 2. IMPORT BATCHES TABLE ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.import_batches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name      VARCHAR(255) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'success', 'partial', 'failed')),
  total_rows     INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count  INTEGER NOT NULL DEFAULT 0,
  failed_count   INTEGER NOT NULL DEFAULT 0,
  error_log      JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own import batches"
  ON public.import_batches
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_user ON public.import_batches(user_id, created_at DESC);
