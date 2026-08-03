import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import {
  calculateWinRate,
  calculateProfitFactor,
  calculateAvgRR,
  calculateTotalPnl,
  type TradeStat,
} from '@/utils/statistics'

// Helper: parse YYYY-MM from query, default to current month
function parseMonth(param: string | null): { year: number; month: number } {
  const now = new Date()
  if (!param || !/^\d{4}-\d{2}$/.test(param)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  const [y, m] = param.split('-').map(Number)
  return { year: y, month: m }
}

// GET /api/dashboard/summary?month=YYYY-MM
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { year, month } = parseMonth(searchParams.get('month'))
    const connectionId   = searchParams.get('connectionId')

    // Date range for current month
    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString()
    const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString()

    // Date range for previous month (for comparison)
    const prevYear  = month === 1 ? year - 1 : year
    const prevMonth = month === 1 ? 12 : month - 1
    const prevStart = new Date(Date.UTC(prevYear, prevMonth - 1, 1)).toISOString()
    const prevEnd   = new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59)).toISOString()

    // Query current month trades
    let query = supabase
      .from('trades')
      .select('pnl, status, close_time, open_time, trade_journal(actual_rr)')
      .eq('user_id', user.id)
      .gte('open_time', startDate)
      .lte('open_time', endDate)
      .limit(5000)

    if (connectionId) query = query.eq('mt5_connection_id', connectionId)

    const { data: currentTrades, error: err1 } = await query
    if (err1) return NextResponse.json({ error: 'DATABASE_ERROR', message: err1.message }, { status: 500 })

    // Query previous month trades
    let prevQuery = supabase
      .from('trades')
      .select('pnl, status, close_time, open_time, trade_journal(actual_rr)')
      .eq('user_id', user.id)
      .gte('open_time', prevStart)
      .lte('open_time', prevEnd)
      .limit(5000)

    if (connectionId) prevQuery = prevQuery.eq('mt5_connection_id', connectionId)

    const { data: prevTrades } = await prevQuery

    // Map to TradeStat with actual_rr from journal
    const mapTrades = (rows: typeof currentTrades): Array<TradeStat & { actual_rr?: number | null }> =>
      (rows ?? []).map((t: any) => ({
        pnl:        t.pnl,
        status:     t.status,
        close_time: t.close_time,
        open_time:  t.open_time,
        actual_rr:  t.trade_journal?.actual_rr ?? null,
      }))

    const curr = mapTrades(currentTrades)
    const prev = mapTrades(prevTrades ?? [])

    // Calculate stats for both months
    const totalPnl      = calculateTotalPnl(curr)
    const winRate       = calculateWinRate(curr)
    const profitFactor  = calculateProfitFactor(curr)
    const avgRR         = calculateAvgRR(curr)
    const totalTrades   = curr.filter((t) => t.status === 'closed').length

    const prevTotalPnl     = calculateTotalPnl(prev)
    const prevWinRate      = calculateWinRate(prev)
    const prevProfitFactor = calculateProfitFactor(prev)
    const prevAvgRR        = calculateAvgRR(prev)
    const prevTotalTrades  = prev.filter((t) => t.status === 'closed').length

    return NextResponse.json({
      month: `${year}-${String(month).padStart(2, '0')}`,
      totalPnl:      Math.round(totalPnl * 100) / 100,
      totalTrades,
      winRate:       Math.round(winRate * 10) / 10,
      profitFactor:  Math.round(profitFactor * 100) / 100,
      avgRR:         Math.round(avgRR * 100) / 100,
      comparison: {
        totalPnl:     Math.round((totalPnl - prevTotalPnl) * 100) / 100,
        totalTrades:  totalTrades - prevTotalTrades,
        winRate:      Math.round((winRate - prevWinRate) * 10) / 10,
        profitFactor: Math.round((profitFactor - prevProfitFactor) * 100) / 100,
        avgRR:        Math.round((avgRR - prevAvgRR) * 100) / 100,
      },
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}
