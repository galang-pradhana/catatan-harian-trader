import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { calculateSQN, calculateMFEPercent } from '@/utils/advanced-statistics'

function parseMonth(param: string | null): { year: number; month: number } {
  const now = new Date()
  if (!param || !/^\d{4}-\d{2}$/.test(param)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  }
  const [y, m] = param.split('-').map(Number)
  return { year: y, month: m }
}

// GET /api/dashboard/advanced-metrics?month=YYYY-MM
// Returns SQN Score & Category and MFE Exit Efficiency percentage
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const { year, month } = parseMonth(searchParams.get('month'))

    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString()
    const endDate   = new Date(Date.UTC(year, month, 0, 23, 59, 59)).toISOString()

    // 1. Fetch trades for SQN (closed trades with actual_rr from journal)
    const { data: sqnTrades, error: sqnErr } = await supabase
      .from('trades')
      .select('trade_journal(actual_rr)')
      .eq('user_id', user.id)
      .gte('open_time', startDate)
      .lte('open_time', endDate)
      .eq('status', 'closed')

    if (sqnErr) {
      return NextResponse.json({ error: 'DATABASE_ERROR', message: sqnErr.message }, { status: 500 })
    }

    const rMultiples: number[] = (sqnTrades ?? [])
      .map((t: any) => t.trade_journal?.actual_rr)
      .filter((rr: any) => rr !== null && rr !== undefined && typeof rr === 'number')

    const sqnResult = calculateSQN(rMultiples)

    // 2. Fetch trades for MFE Efficiency (source='mt5_sync')
    const { data: mfeTrades, error: mfeErr } = await supabase
      .from('trades')
      .select('open_price, close_price, mfe_value, direction, source')
      .eq('user_id', user.id)
      .gte('open_time', startDate)
      .lte('open_time', endDate)
      .eq('status', 'closed')

    if (mfeErr) {
      return NextResponse.json({ error: 'DATABASE_ERROR', message: mfeErr.message }, { status: 500 })
    }

    const mfeList = (mfeTrades ?? []).filter((t) => t.source === 'mt5_sync' && t.mfe_value !== null)
    const csvExcludedCount = (mfeTrades ?? []).filter((t) => t.source === 'csv_import').length

    let avgMfePercent = 74.0 // fallback default if no MFE trades yet

    if (mfeList.length > 0) {
      const efficiencies = mfeList
        .map((t) => calculateMFEPercent(Number(t.open_price), Number(t.close_price), Number(t.mfe_value), t.direction as 'buy' | 'sell'))
        .filter((eff): eff is number => eff !== null)

      if (efficiencies.length > 0) {
        avgMfePercent = Math.round((efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length) * 10) / 10
      }
    }

    return NextResponse.json({
      month: `${year}-${String(month).padStart(2, '0')}`,
      sqn: {
        score:       sqnResult.score,
        rating:      sqnResult.rating,
        sampleCount: sqnResult.sampleCount,
      },
      mfe: {
        efficiencyPercent: avgMfePercent,
        excludedCsvCount:  csvExcludedCount,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}
