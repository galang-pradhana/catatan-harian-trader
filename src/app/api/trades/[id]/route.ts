import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { toUSD, type AccountType } from '@/utils/currency'

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
        id, mt5_connection_id, mt5_ticket_id, symbol, direction, volume,
        open_price, close_price, open_time, close_time,
        sl, tp, pnl, commission, swap, status, session,
        journal_status, source, created_at, updated_at,
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

    const { data: connData } = await supabase
      .from('mt5_connections')
      .select('account_type')
      .eq('id', trade.mt5_connection_id)
      .single()

    const accountType = (connData?.account_type as AccountType) || 'standard'

    const result = {
      ...trade,
      pnl: trade.pnl != null ? toUSD(Number(trade.pnl), accountType) : null,
      strategies: (trade.trade_strategies as any[])?.map((ts: any) => ts.strategies) ?? [],
      mistakes:   (trade.trade_mistakes as any[])?.map((tm: any) => tm.mistake_tags) ?? [],
      screenshots: trade.trade_screenshots ?? [],
      journal:     trade.trade_journal ?? null,
    }

    return NextResponse.json({ trade: result })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}

// PATCH /api/trades/[id] — Update a manual trade's core data
export async function PATCH(
  request: NextRequest,
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

    const { data: existing, error: fetchErr } = await supabase
      .from('trades')
      .select('id, source, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Trade tidak ditemukan' }, { status: 404 })
    }

    if (existing.source !== 'manual') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Hanya trade manual yang bisa diedit. Trade dari MT5/CSV tidak dapat diubah.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { symbol, direction, volume, open_price, close_price, open_time, close_time, sl, tp, pnl, commission, swap, session } = body

    const isClosed = close_price !== null && close_price !== undefined && close_price !== ''

    let calculatedPnl = pnl !== undefined && pnl !== '' ? Number(pnl) : null
    if (isClosed && calculatedPnl === null && open_price && direction) {
      const diff = direction === 'buy'
        ? Number(close_price) - Number(open_price)
        : Number(open_price) - Number(close_price)
      calculatedPnl = diff * Number(volume || 1) * 100
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (symbol !== undefined)      updateData.symbol      = String(symbol).toUpperCase().trim()
    if (direction !== undefined)   updateData.direction   = direction === 'sell' ? 'sell' : 'buy'
    if (volume !== undefined)      updateData.volume      = Number(volume)
    if (open_price !== undefined)  updateData.open_price  = Number(open_price)
    if (open_time !== undefined)   updateData.open_time   = new Date(open_time).toISOString()
    if (sl !== undefined)          updateData.sl          = sl ? Number(sl) : null
    if (tp !== undefined)          updateData.tp          = tp ? Number(tp) : null
    if (commission !== undefined)  updateData.commission  = Number(commission) || 0
    if (swap !== undefined)        updateData.swap        = Number(swap) || 0
    if (session !== undefined)     updateData.session     = session || null

    if (isClosed) {
      updateData.close_price = Number(close_price)
      updateData.close_time  = close_time ? new Date(close_time).toISOString() : new Date().toISOString()
      updateData.status      = 'closed'
      updateData.pnl         = calculatedPnl
    } else if (close_price === null || close_price === '') {
      updateData.close_price = null
      updateData.close_time  = null
      updateData.status      = 'open'
      updateData.pnl         = null
    }

    const { data: updatedTrade, error: updateErr } = await supabase
      .from('trades')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: 'DATABASE_ERROR', message: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ trade: updatedTrade })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}

// DELETE /api/trades/[id] — Hapus trade manual saja
export async function DELETE(
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

    const { data: existing } = await supabase
      .from('trades')
      .select('id, source')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Trade tidak ditemukan' }, { status: 404 })
    }

    if (existing.source !== 'manual') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Hanya trade manual yang bisa dihapus.' },
        { status: 403 }
      )
    }

    const { error: delErr } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (delErr) {
      return NextResponse.json({ error: 'DATABASE_ERROR', message: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}
