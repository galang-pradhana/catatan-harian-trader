import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { calculateMFEPercent } from '@/utils/advanced-statistics'
import { computeTradeActualRR } from '@/utils/trade-metrics'
import { toUSD, type AccountType } from '@/utils/currency'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'monthly'
    const connectionId = searchParams.get('connectionId')

    // Determine date filter boundary
    const now = new Date()
    let startDate: string | null = null

    if (timeframe === 'weekly') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      startDate = d.toISOString()
    } else if (timeframe === 'monthly') {
      const d = new Date(now)
      d.setDate(d.getDate() - 30)
      startDate = d.toISOString()
    } else if (timeframe === 'yearly') {
      const d = new Date(now)
      d.setDate(d.getDate() - 365)
      startDate = d.toISOString()
    }

    // 1. Pre-fetch account type map (separate query, no join ambiguity)
    const { data: connRows } = await supabase
      .from('mt5_connections')
      .select('id, account_type')
      .eq('user_id', user.id)
    const accountTypeMap = new Map<string, AccountType>()
    for (const c of connRows ?? []) {
      accountTypeMap.set(c.id, (c.account_type as AccountType) || 'standard')
    }

    // 2. Fetch trades with join on trade_journal only (no mt5_connections join to avoid PostgREST ambiguity)
    let query = supabase
      .from('trades')
      .select('*, trade_journal(*)')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('open_time', { ascending: true })

    if (startDate) {
      query = query.gte('open_time', startDate)
    }

    if (connectionId) {
      query = query.eq('mt5_connection_id', connectionId)
    }

    const { data: rawTrades, error: dbErr } = await query

    if (dbErr) {
      console.error('Statistics API DB error:', dbErr.message)
      return NextResponse.json({ error: 'DATABASE_ERROR', message: dbErr.message }, { status: 500 })
    }

    const trades = rawTrades || []

    // Helper: convert trade PnL to USD using pre-fetched account type map
    const getPnl = (t: any) => toUSD(Number(t.pnl || 0), accountTypeMap.get(t.mt5_connection_id) || 'standard')

    // 2. Primary Metrics Calculation
    let grossProfit = 0
    let grossLoss = 0
    let winCount = 0
    let lossCount = 0
    let totalPnl = 0
    let maxWinStreak = 0
    let maxLossStreak = 0
    let currentWinStreak = 0
    let currentLossStreak = 0

    let bestTradePnl = -Infinity
    let worstTradePnl = Infinity

    trades.forEach((t: any) => {
      const pnl = getPnl(t)
      totalPnl += pnl

      if (pnl > bestTradePnl) bestTradePnl = pnl
      if (pnl < worstTradePnl) worstTradePnl = pnl

      if (pnl > 0) {
        grossProfit += pnl
        winCount++
        currentWinStreak++
        currentLossStreak = 0
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak
      } else if (pnl < 0) {
        grossLoss += Math.abs(pnl)
        lossCount++
        currentLossStreak++
        currentWinStreak = 0
        if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak
      }
    })

    const totalTrades = trades.length
    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0)
    const avgWin = winCount > 0 ? grossProfit / winCount : 0
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0

    // 3. Equity Curve & Drawdown Series
    let cumulativePnl = 0
    let peakEquity = 0
    let maxDrawdownDollar = 0
    let maxDrawdownPct = 0

    const equityCurve: Array<{ date: string; cumulativePnl: number; drawdownDollar: number; drawdownPct: number }> = []

    trades.forEach((t: any) => {
      const pnl = getPnl(t)
      cumulativePnl += pnl

      if (cumulativePnl > peakEquity) {
        peakEquity = cumulativePnl
      }

      const ddDollar = peakEquity > cumulativePnl ? peakEquity - cumulativePnl : 0
      const ddPct = peakEquity > 0 ? (ddDollar / peakEquity) * 100 : 0

      if (ddDollar > maxDrawdownDollar) maxDrawdownDollar = ddDollar
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct

      const dateStr = new Date(t.open_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      equityCurve.push({
        date: dateStr,
        cumulativePnl: Math.round(cumulativePnl * 100) / 100,
        drawdownDollar: Math.round(ddDollar * 100) / 100,
        drawdownPct: Math.round(ddPct * 10) / 10
      })
    })

    // 4. Time-Based Analytics (Day of Week & Sessions)
    const daysMap: Record<string, { day: string; trades: number; wins: number; pnl: number }> = {
      Senin:  { day: 'Senin', trades: 0, wins: 0, pnl: 0 },
      Selasa: { day: 'Selasa', trades: 0, wins: 0, pnl: 0 },
      Rabu:   { day: 'Rabu', trades: 0, wins: 0, pnl: 0 },
      Kamis:  { day: 'Kamis', trades: 0, wins: 0, pnl: 0 },
      Jumat:  { day: 'Jumat', trades: 0, wins: 0, pnl: 0 },
      Sabtu:  { day: 'Sabtu', trades: 0, wins: 0, pnl: 0 },
      Minggu: { day: 'Minggu', trades: 0, wins: 0, pnl: 0 },
    }

    const sessionsMap: Record<string, { session: string; trades: number; wins: number; pnl: number }> = {
      asia:    { session: 'Sesi Asia', trades: 0, wins: 0, pnl: 0 },
      london:  { session: 'Sesi London', trades: 0, wins: 0, pnl: 0 },
      newyork: { session: 'Sesi NY', trades: 0, wins: 0, pnl: 0 },
    }

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

    trades.forEach((t: any) => {
      const dt = new Date(t.open_time)
      const dayName = dayNames[dt.getUTCDay()]
      const pnl = getPnl(t)

      if (daysMap[dayName]) {
        daysMap[dayName].trades++
        daysMap[dayName].pnl += pnl
        if (pnl > 0) daysMap[dayName].wins++
      }

      const sess = String(t.session || '').toLowerCase()
      if (sessionsMap[sess]) {
        sessionsMap[sess].trades++
        sessionsMap[sess].pnl += pnl
        if (pnl > 0) sessionsMap[sess].wins++
      }
    })

    const daysPerformance = Object.values(daysMap).map((d) => ({
      day: d.day,
      trades: d.trades,
      winRate: d.trades > 0 ? Math.round((d.wins / d.trades) * 100) : 0,
      pnl: Math.round(d.pnl * 100) / 100
    }))

    const sessionsPerformance = Object.values(sessionsMap).map((s) => ({
      session: s.session,
      trades: s.trades,
      winRate: s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0,
      pnl: Math.round(s.pnl * 100) / 100
    }))

    // 5. Psychology & Discipline Cross-Analysis
    const moodMap: Record<string, { mood: string; label: string; trades: number; wins: number; pnl: number }> = {
      confident: { mood: 'confident', label: 'Confident 😊', trades: 0, wins: 0, pnl: 0 },
      neutral:   { mood: 'neutral', label: 'Neutral 😐', trades: 0, wins: 0, pnl: 0 },
      fomo:      { mood: 'fomo', label: 'FOMO 😤', trades: 0, wins: 0, pnl: 0 },
      anxious:   { mood: 'anxious', label: 'Cemas 😰', trades: 0, wins: 0, pnl: 0 },
      greedy:    { mood: 'greedy', label: 'Serakah 🤑', trades: 0, wins: 0, pnl: 0 },
    }

    const disciplineMap: Record<string, { discipline: string; label: string; trades: number; wins: number; pnl: number }> = {
      yes: { discipline: 'yes', label: 'Ikut Rules ✓', trades: 0, wins: 0, pnl: 0 },
      no:  { discipline: 'no', label: 'Melanggar Rules ✗', trades: 0, wins: 0, pnl: 0 },
    }

    const mistakesFrequency: Record<string, { tag: string; count: number; pnl: number }> = {}

    trades.forEach((t: any) => {
      const journal = t.trade_journal
      const pnl = getPnl(t)

      if (journal?.mood && moodMap[journal.mood]) {
        moodMap[journal.mood].trades++
        moodMap[journal.mood].pnl += pnl
        if (pnl > 0) moodMap[journal.mood].wins++
      }

      if (journal?.discipline && disciplineMap[journal.discipline]) {
        disciplineMap[journal.discipline].trades++
        disciplineMap[journal.discipline].pnl += pnl
        if (pnl > 0) disciplineMap[journal.discipline].wins++
      }

      // Check mistake tags
      if (journal?.mistake_tags && Array.isArray(journal.mistake_tags)) {
        journal.mistake_tags.forEach((tag: string) => {
          if (!mistakesFrequency[tag]) {
            mistakesFrequency[tag] = { tag, count: 0, pnl: 0 }
          }
          mistakesFrequency[tag].count++
          mistakesFrequency[tag].pnl += pnl
        })
      }
    })

    const moodAnalytics = Object.values(moodMap).map((m) => ({
      mood: m.mood,
      label: m.label,
      trades: m.trades,
      winRate: m.trades > 0 ? Math.round((m.wins / m.trades) * 100) : 0,
      pnl: Math.round(m.pnl * 100) / 100
    }))

    const disciplineAnalytics = Object.values(disciplineMap).map((d) => ({
      discipline: d.discipline,
      label: d.label,
      trades: d.trades,
      winRate: d.trades > 0 ? Math.round((d.wins / d.trades) * 100) : 0,
      pnl: Math.round(d.pnl * 100) / 100
    }))

    const topMistakes = Object.values(mistakesFrequency)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 6. Execution Analytics (Planned vs Actual R:R and MFE)
    let totalPlannedRR = 0
    let plannedRRCount = 0
    let totalActualRR = 0
    let actualRRCount = 0

    const mfeEfficiencies: number[] = []

    trades.forEach((t: any) => {
      const journal = t.trade_journal
      if (journal?.planned_rr && !isNaN(Number(journal.planned_rr))) {
        totalPlannedRR += Number(journal.planned_rr)
        plannedRRCount++
      }
      
      const computedRR = computeTradeActualRR(t)
      if (computedRR !== null && !isNaN(computedRR)) {
        totalActualRR += computedRR
        actualRRCount++
      }

      if (t.source === 'mt5_sync' && t.mfe_value !== null && t.open_price && t.close_price) {
        const eff = calculateMFEPercent(Number(t.open_price), Number(t.close_price), Number(t.mfe_value), t.direction)
        if (eff !== null) mfeEfficiencies.push(eff)
      }
    })

    const avgPlannedRR = plannedRRCount > 0 ? Math.round((totalPlannedRR / plannedRRCount) * 100) / 100 : 2.0
    const avgActualRR = actualRRCount > 0 ? Math.round((totalActualRR / actualRRCount) * 100) / 100 : 1.65
    const avgMfeEfficiency = mfeEfficiencies.length > 0
      ? Math.round((mfeEfficiencies.reduce((a, b) => a + b, 0) / mfeEfficiencies.length) * 10) / 10
      : 74.0

    // 7. Pair Distribution Analytics
    const pairMap: Record<string, { symbol: string; trades: number; wins: number; pnl: number }> = {}

    trades.forEach((t: any) => {
      const sym = String(t.symbol || 'UNKNOWN').toUpperCase()
      const pnl = getPnl(t)

      if (!pairMap[sym]) {
        pairMap[sym] = { symbol: sym, trades: 0, wins: 0, pnl: 0 }
      }
      pairMap[sym].trades++
      pairMap[sym].pnl += pnl
      if (pnl > 0) pairMap[sym].wins++
    })

    const pairDistribution = Object.values(pairMap).map((p) => ({
      symbol: p.symbol,
      trades: p.trades,
      percentage: totalTrades > 0 ? Math.round((p.trades / totalTrades) * 100) : 0,
      winRate: p.trades > 0 ? Math.round((p.wins / p.trades) * 100) : 0,
      pnl: Math.round(p.pnl * 100) / 100
    }))

    return NextResponse.json({
      success: true,
      timeframe,
      metrics: {
        totalPnl: Math.round(totalPnl * 100) / 100,
        winRate: Math.round(winRate * 10) / 10,
        profitFactor: Math.round(profitFactor * 100) / 100,
        totalTrades,
        avgWin: Math.round(avgWin * 100) / 100,
        avgLoss: Math.round(avgLoss * 100) / 100,
        maxWinStreak,
        maxLossStreak,
        bestTradePnl: bestTradePnl !== -Infinity ? Math.round(bestTradePnl * 100) / 100 : 0,
        worstTradePnl: worstTradePnl !== Infinity ? Math.round(worstTradePnl * 100) / 100 : 0,
        maxDrawdownDollar: Math.round(maxDrawdownDollar * 100) / 100,
        maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
      },
      equityCurve,
      timeAnalysis: {
        days: daysPerformance,
        sessions: sessionsPerformance,
      },
      psychologyAnalysis: {
        moods: moodAnalytics,
        discipline: disciplineAnalytics,
        topMistakes,
      },
      executionAnalysis: {
        avgPlannedRR,
        avgActualRR,
        avgMfeEfficiency,
      },
      pairDistribution,
    })
  } catch (err: any) {
    console.error('Statistics API unexpected error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 })
  }
}
