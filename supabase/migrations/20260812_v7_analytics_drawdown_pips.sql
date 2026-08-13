-- ============================================================
-- Migration 20260812_v7_analytics_drawdown_pips.sql
-- PRD Addendum V7: Drawdown Metrics, Symbol Pip Configs, Pips Gained, Market Condition Tag
-- ============================================================

-- ─── 1. BALANCE SNAPSHOTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.balance_snapshots (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mt5_connection_id  UUID NOT NULL REFERENCES public.mt5_connections(id) ON DELETE CASCADE,
  balance            DECIMAL(18, 2) NOT NULL,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own balance snapshots"
  ON public.balance_snapshots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.mt5_connections
      WHERE id = mt5_connection_id AND user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_balance_snapshots_conn_time
  ON public.balance_snapshots (mt5_connection_id, recorded_at ASC);

-- ─── 2. SYMBOL PIP CONFIGS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.symbol_pip_configs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol       VARCHAR(30) NOT NULL,
  pip_size     DECIMAL(18, 6) NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, symbol)
);

ALTER TABLE public.symbol_pip_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own symbol_pip_configs"
  ON public.symbol_pip_configs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_symbol_pip_configs_user_symbol
  ON public.symbol_pip_configs (user_id, symbol);

-- ─── 3. TRADES: PIPS GAINED ────────────────────────────────
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS pips_gained DECIMAL(18, 2);

-- ─── 4. TRADE JOURNAL: MARKET CONDITION ────────────────────
ALTER TABLE public.trade_journal
  ADD COLUMN IF NOT EXISTS market_condition VARCHAR(20) CHECK (market_condition IN ('ranging', 'trending'));
