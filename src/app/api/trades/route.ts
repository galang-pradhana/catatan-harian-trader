import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

// GET /api/trades — List trades for authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const connectionId  = searchParams.get('connectionId')
    const startDate     = searchParams.get('startDate')
    const endDate       = searchParams.get('endDate')
    const date          = searchParams.get('date') // 'YYYY-MM-DD'
    const symbol        = searchParams.get('symbol')
    const status        = searchParams.get('status') // 'open' | 'closed' | null
    const strategyId    = searchParams.get('strategyId')
    const result        = searchParams.get('result') // 'profit' | 'loss' | null
    const journalStatus = searchParams.get('journalStatus') // 'complete' | 'incomplete' | null
    const page          = parseInt(searchParams.get('page') || '1', 10)
    const limit         = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset        = (page - 1) * limit

    let query = supabase
      .from('trades')
      .select(
        `
        id, mt5_ticket_id, symbol, direction, volume,
        open_price, close_price, open_time, close_time,
        sl, tp, pnl, commission, swap, status, session,
        journal_status, created_at,
        trade_journal (
          id, reason_entry, mood, discipline, self_grade, updated_at
        )
        `,
        { count: 'exact' }
      )
      .eq('user_id', user.id)
      .order('open_time', { ascending: false })
      .range(offset, offset + limit - 1)

    // Optional filters
    if (connectionId)  query = query.eq('mt5_connection_id', connectionId)
    if (symbol)        query = query.ilike('symbol', `%${symbol}%`)
    if (status)        query = query.eq('status', status)
    if (journalStatus) query = query.eq('journal_status', journalStatus)
    if (startDate)     query = query.gte('open_time', startDate)
    if (endDate)       query = query.lte('open_time', endDate)

    if (date) {
      query = query
        .gte('open_time', `${date}T00:00:00.000Z`)
        .lte('open_time', `${date}T23:59:59.999Z`)
    }

    const month = searchParams.get('month')
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number)
      const monthStart = new Date(Date.UTC(y, m - 1, 1)).toISOString()
      const monthEnd   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)).toISOString()
      query = query.gte('open_time', monthStart).lte('open_time', monthEnd)
    }

    if (result === 'profit') query = query.gt('pnl', 0)
    if (result === 'loss')   query = query.lt('pnl', 0)

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      trades:      data ?? [],
      total:       count ?? 0,
      page,
      limit,
      totalPages:  Math.ceil((count ?? 0) / limit),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}
