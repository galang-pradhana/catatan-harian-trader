-- ============================================================
-- Migration 003: Trades, Journal, Strategies, Mistake Tags
-- ============================================================

-- ─── 1. STRATEGIES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strategies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20) NOT NULL DEFAULT '#D4A94C',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ -- soft delete
);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own strategies"
  ON public.strategies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 2. MISTAKE TAGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mistake_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(20) NOT NULL DEFAULT '#EF4444',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ -- soft delete
);

ALTER TABLE public.mistake_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own mistake_tags"
  ON public.mistake_tags
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 3. TRADES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trades (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mt5_connection_id  UUID NOT NULL REFERENCES public.mt5_connections(id) ON DELETE CASCADE,
  mt5_ticket_id      BIGINT NOT NULL,
  symbol             VARCHAR(20) NOT NULL,
  direction          VARCHAR(4) NOT NULL CHECK (direction IN ('buy', 'sell')),
  volume             DECIMAL(10, 2) NOT NULL,
  open_price         DECIMAL(18, 5) NOT NULL,
  close_price        DECIMAL(18, 5),
  open_time          TIMESTAMPTZ NOT NULL,
  close_time         TIMESTAMPTZ,
  sl                 DECIMAL(18, 5),
  tp                 DECIMAL(18, 5),
  pnl                DECIMAL(18, 2),
  commission         DECIMAL(18, 2) NOT NULL DEFAULT 0,
  swap               DECIMAL(18, 2) NOT NULL DEFAULT 0,
  status             VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  session            VARCHAR(10) CHECK (session IN ('asia', 'london', 'newyork')),
  journal_status     VARCHAR(10) NOT NULL DEFAULT 'incomplete' CHECK (journal_status IN ('incomplete', 'complete')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate import from same connection
  UNIQUE (mt5_connection_id, mt5_ticket_id)
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own trades"
  ON public.trades
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast query by user + time
CREATE INDEX IF NOT EXISTS idx_trades_user_open_time
  ON public.trades (user_id, open_time DESC);

CREATE INDEX IF NOT EXISTS idx_trades_connection
  ON public.trades (mt5_connection_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW EXECUTE FUNCTION update_trades_updated_at();

-- ─── 4. TRADE JOURNAL ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trade_journal (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id        UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason_entry    TEXT,
  mood            VARCHAR(20) CHECK (mood IN ('neutral', 'confident', 'fomo', 'anxious', 'greedy')),
  discipline      VARCHAR(3) CHECK (discipline IN ('yes', 'no')),
  lesson_learned  TEXT,
  risk_percent    DECIMAL(5, 2) CHECK (risk_percent >= 0 AND risk_percent <= 100),
  planned_rr      DECIMAL(8, 2),
  actual_rr       DECIMAL(8, 2),
  self_grade      VARCHAR(1) CHECK (self_grade IN ('A', 'B', 'C', 'D', 'F')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (trade_id) -- 1 journal per trade
);

ALTER TABLE public.trade_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trade journal"
  ON public.trade_journal
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 5. TRADE SCREENSHOTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trade_screenshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id    UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        VARCHAR(5) NOT NULL CHECK (type IN ('entry', 'exit')),
  storage_path TEXT NOT NULL,
  url         TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own screenshots"
  ON public.trade_screenshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── 6. PIVOT: TRADE STRATEGIES ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.trade_strategies (
  trade_id    UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  PRIMARY KEY (trade_id, strategy_id)
);

ALTER TABLE public.trade_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trade_strategies"
  ON public.trade_strategies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE id = trade_id AND user_id = auth.uid()
    )
  );

-- ─── 7. PIVOT: TRADE MISTAKES ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.trade_mistakes (
  trade_id       UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  mistake_tag_id UUID NOT NULL REFERENCES public.mistake_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (trade_id, mistake_tag_id)
);

ALTER TABLE public.trade_mistakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own trade_mistakes"
  ON public.trade_mistakes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.trades
      WHERE id = trade_id AND user_id = auth.uid()
    )
  );

-- ─── 8. DEFAULT SEED DATA ───────────────────────────────────
-- (Optional: default strategies & mistake tags are created per user via the app)
