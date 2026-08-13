import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { toUSD, type AccountType } from '@/utils/currency'

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
    const source        = searchParams.get('source') // 'manual' | 'mt5_sync' | 'csv_import' | null
    const page          = parseInt(searchParams.get('page') || '1', 10)
    const limit         = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset        = (page - 1) * limit

    let query = supabase
      .from('trades')
      .select(
        `
        id, mt5_connection_id, mt5_ticket_id, symbol, direction, volume,
        open_price, close_price, open_time, close_time,
        sl, tp, pnl, commission, swap, status, session,
        journal_status, source, created_at,
        trade_journal (
          id, group_id, group_name, reason_entry, mood, discipline, self_grade, updated_at
        ),
        trade_strategies (
          strategies ( id, name, color )
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
    if (source)        query = query.eq('source', source)

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

    // Pre-fetch account type map for PnL conversion
    const { data: connRows } = await supabase
      .from('mt5_connections')
      .select('id, account_type')
      .eq('user_id', user.id)
    const accountTypeMap = new Map<string, AccountType>()
    for (const c of connRows ?? []) {
      accountTypeMap.set(c.id, (c.account_type as AccountType) || 'standard')
    }

    const formattedTrades = (data ?? []).map((t: any) => ({
      ...t,
      pnl: t.pnl != null ? toUSD(Number(t.pnl), accountTypeMap.get(t.mt5_connection_id) || 'standard') : null,
      strategies: (t.trade_strategies as any[])?.map((ts: any) => ts.strategies).filter(Boolean) ?? [],
    }))

    return NextResponse.json({
      trades:      formattedTrades,
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

// POST /api/trades — Create a new trade manually
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      connectionId: reqConnId,
      connection_id: reqConnId2,
      mt5_connection_id: reqConnId3,
      symbol,
      direction,
      volume,
      open_price,
      close_price,
      open_time,
      close_time,
      sl,
      tp,
      pnl,
      commission = 0,
      swap = 0,
      session,
    } = body

    if (!symbol || !direction || !volume || open_price === undefined || !open_time) {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Symbol, direction, volume, open_price, dan open_time wajib diisi' },
        { status: 400 }
      )
    }

    // Get or use provided mt5_connection_id for the user
    let connectionId: string | null = reqConnId || reqConnId2 || reqConnId3 || null
    if (!connectionId) {
      const { data: connections } = await supabase
        .from('mt5_connections')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (connections && connections.length > 0) {
        connectionId = connections[0].id
      } else {
        // Auto-create a default manual connection for the user
        const { data: newConn } = await supabase
          .from('mt5_connections')
          .insert({
            user_id: user.id,
            broker_name: 'Jurnal Trading Manual',
            status: 'connected',
            platform: 'manual',
            api_token_hash: `manual_${user.id}_${Date.now()}`,
          })
          .select('id')
          .single()

        if (newConn) connectionId = newConn.id
      }
    }

    if (!connectionId) {
      return NextResponse.json(
        { error: 'CONNECTION_ERROR', message: 'Gagal menyiapkan akun jurnal' },
        { status: 500 }
      )
    }

    const randomTicket = Math.floor(10000000 + Math.random() * 90000000)
    const isClosed = close_price !== null && close_price !== undefined

    // Calculate PnL fallback if close_price is supplied but pnl is not
    let calculatedPnl = pnl
    if (isClosed && (calculatedPnl === undefined || calculatedPnl === null)) {
      const diff = direction === 'buy' ? Number(close_price) - Number(open_price) : Number(open_price) - Number(close_price)
      calculatedPnl = diff * Number(volume) * 100 // Estimate
    }

    const { data: newTrade, error: insertErr } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        mt5_connection_id: connectionId,
        mt5_ticket_id: randomTicket,
        symbol: String(symbol).toUpperCase().trim(),
        direction: direction === 'sell' ? 'sell' : 'buy',
        volume: Number(volume),
        open_price: Number(open_price),
        close_price: isClosed ? Number(close_price) : null,
        open_time: new Date(open_time).toISOString(),
        close_time: close_time ? new Date(close_time).toISOString() : (isClosed ? new Date().toISOString() : null),
        sl: sl ? Number(sl) : null,
        tp: tp ? Number(tp) : null,
        pnl: calculatedPnl !== null && calculatedPnl !== undefined ? Number(calculatedPnl) : null,
        commission: Number(commission),
        swap: Number(swap),
        status: isClosed ? 'closed' : 'open',
        session: session || null,
        source: 'manual',
        journal_status: 'incomplete',
      })
      .select('*')
      .single()

    if (insertErr) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: insertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ trade: newTrade }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}

