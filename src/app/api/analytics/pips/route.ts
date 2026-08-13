import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

// GET /api/analytics/pips — Accumulated Pips analytics with strategy & market condition filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7) // YYYY-MM
    const marketCondition = searchParams.get('market_condition') // 'ranging' | 'trending' | null
    const strategyIdsParam = searchParams.get('strategy_ids') // comma-separated strategy UUIDs

    const strategyIds = strategyIdsParam
      ? strategyIdsParam.split(',').filter(Boolean)
      : []

    // 1. Determine month date boundaries (UTC)
    const [year, monthNum] = monthParam.split('-').map(Number)
    const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0)).toISOString()
    const endOfMonth = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59)).toISOString()

    // 2. Fetch user's closed trades in the target month with journal
    let query = supabase
      .from('trades')
      .select('id, symbol, direction, open_time, close_time, pips_gained, trade_journal(market_condition), trade_strategies(strategy_id)')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .gte('close_time', startOfMonth)
      .lte('close_time', endOfMonth)

    const { data: rawTrades, error: dbErr } = await query

    if (dbErr) {
      return NextResponse.json({ error: 'DATABASE_ERROR', message: dbErr.message }, { status: 500 })
    }

    const trades = rawTrades || []

    // 3. Count excluded trades (pips_gained is NULL because pip size unconfirmed)
    const excludedCount = trades.filter((t: any) => t.pips_gained === null || t.pips_gained === undefined).length

    // 4. Filter trades with valid pips_gained AND matching strategy_ids AND market_condition
    const validTrades = trades.filter((t: any) => {
      // Must have calculated pips
      if (t.pips_gained === null || t.pips_gained === undefined) return false

      // Filter: Market Condition (AND logic)
      if (marketCondition && marketCondition !== 'all') {
        const journalCond = (t.trade_journal as any)?.market_condition
        if (journalCond !== marketCondition) return false
      }

      // Filter: Strategy Tag (AND logic: trade must have AT LEAST ONE of selected strategy_ids)
      if (strategyIds.length > 0) {
        const tradeStratIds = ((t.trade_strategies as any[]) || []).map((ts: any) => ts.strategy_id)
        const hasMatchingStrat = strategyIds.some((sid) => tradeStratIds.includes(sid))
        if (!hasMatchingStrat) return false
      }

      return true
    })

    // 5. Aggregate by day & compute monthly total
    const dailyMap: Record<string, { date: string; pips: number; tradesCount: number }> = {}

    // Pre-fill all days of the month for smooth chart rendering
    const totalDaysInMonth = new Date(year, monthNum, 0).getDate()
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = `${monthParam}-${String(day).padStart(2, '0')}`
      dailyMap[dayStr] = { date: dayStr, pips: 0, tradesCount: 0 }
    }

    let monthlyTotalPips = 0

    validTrades.forEach((t: any) => {
      const closeDate = new Date(t.close_time).toISOString().slice(0, 10)
      const pips = Number(t.pips_gained || 0)

      monthlyTotalPips += pips

      if (dailyMap[closeDate]) {
        dailyMap[closeDate].pips = Math.round((dailyMap[closeDate].pips + pips) * 100) / 100
        dailyMap[closeDate].tradesCount++
      } else {
        dailyMap[closeDate] = {
          date: closeDate,
          pips: Math.round(pips * 100) / 100,
          tradesCount: 1,
        }
      }
    })

    const dailyPipsList = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      month: monthParam,
      monthlyTotalPips: Math.round(monthlyTotalPips * 100) / 100,
      validTradesCount: validTrades.length,
      excludedCount,
      dailyPips: dailyPipsList,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}
