import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

// GET /api/trades/[id] — Trade detail with journal, strategies, mistakes, screenshots
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const { data: trade, error } = await supabase
      .from('trades')
      .select(
        `
        id, mt5_ticket_id, symbol, direction, volume,
        open_price, close_price, open_time, close_time,
        sl, tp, pnl, commission, swap, status, session,
        journal_status, created_at, updated_at,
        trade_journal (
          id, group_id, group_name, reason_entry, mood, discipline, lesson_learned,
          risk_percent, planned_rr, actual_rr, self_grade,
          created_at, updated_at
        ),
        trade_strategies (
          strategies ( id, name, color )
        ),
        trade_mistakes (
          mistake_tags ( id, name, color )
        ),
        trade_screenshots (
          id, type, url, uploaded_at
        )
        `
      )
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !trade) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Trade tidak ditemukan' },
        { status: 404 }
      )
    }

    // Flatten nested pivot relations
    const result = {
      ...trade,
      strategies: (trade.trade_strategies as any[])?.map((ts: any) => ts.strategies) ?? [],
      mistakes:   (trade.trade_mistakes as any[])?.map((tm: any) => tm.mistake_tags) ?? [],
      screenshots: trade.trade_screenshots ?? [],
      journal:     trade.trade_journal ?? null,
    }

    return NextResponse.json({ trade: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}
