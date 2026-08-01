import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { groupBySymbol, type TradeStat } from '@/utils/statistics'

function parseMonth(param: string | null): { year: number; month: number } {
  const now = new Date()
  if (!param || !/^\d{4}-\d{2}$/.test(param)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  const [y, m] = param.split('-').map(Number)
  return { year: y, month: m }
}

// GET /api/dashboard/by-symbol?month=YYYY-MM
// Returns array of { symbol, trades, wins, losses, winRate, pnl }
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const { year, month } = parseMonth(searchParams.get('month'))
    const connectionId    = searchParams.get('connectionId')

    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString()
    const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString()

    let query = supabase
      .from('trades')
      .select('pnl, status, close_time, open_time, symbol')
      .eq('user_id', user.id)
      .gte('open_time', startDate)
      .lte('open_time', endDate)
      .eq('status', 'closed')

    if (connectionId) query = query.eq('mt5_connection_id', connectionId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    const trades = (data ?? []) as Array<TradeStat & { symbol: string }>
    const bySymbol = groupBySymbol(trades)

    return NextResponse.json({
      month:    `${year}-${String(month).padStart(2, '0')}`,
      symbols:  bySymbol,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}
