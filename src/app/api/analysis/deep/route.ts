import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { calculateSQN, calculateMFEPercent } from '@/utils/advanced-statistics'
import { computeTradeActualRR } from '@/utils/trade-metrics'

// ── Period SQN: group trades by week or month, compute SQN per period ─────────
function buildPeriodicSQN(
  trades: any[],
  granularity: 'weekly' | 'monthly'
): Array<{ label: string; sqn: number; tradeCount: number; isSmallSample: boolean }> {
  const buckets = new Map<string, number[]>()

  for (const t of trades) {
    const rr = computeTradeActualRR(t)
    if (rr === null || isNaN(rr)) continue

    const dt = new Date(t.open_time)
    let key: string
    if (granularity === 'monthly') {
      key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    } else {
      // ISO Week
      const jan1 = new Date(dt.getFullYear(), 0, 1)
      const week = Math.ceil(((dt.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
      key = `${dt.getFullYear()}-W${String(week).padStart(2, '0')}`
    }

    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(rr)
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, rMultiples]) => {
      const result = calculateSQN(rMultiples)
      const label = granularity === 'monthly'
        ? (() => {
            const [y, m] = key.split('-')
            return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
          })()
        : key.replace('-', ' ')
      return {
        label,
        sqn: result.score,
        tradeCount: result.sampleCount,
        isSmallSample: result.sampleCount < 10,
      }
    })
}

// ── Expectancy per period ──────────────────────────────────────────────────────
function buildPeriodicExpectancy(
  trades: any[],
  granularity: 'weekly' | 'monthly'
): Array<{ label: string; expectancy: number; tradeCount: number }> {
  const buckets = new Map<string, { wins: number; losses: number; grossProfit: number; grossLoss: number }>()

  for (const t of trades) {
    const pnl = Number(t.pnl ?? 0)
    const dt = new Date(t.open_time)
    let key: string
    if (granularity === 'monthly') {
      key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    } else {
      const jan1 = new Date(dt.getFullYear(), 0, 1)
      const week = Math.ceil(((dt.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
      key = `${dt.getFullYear()}-W${String(week).padStart(2, '0')}`
    }

    if (!buckets.has(key)) buckets.set(key, { wins: 0, losses: 0, grossProfit: 0, grossLoss: 0 })
    const b = buckets.get(key)!
    if (pnl > 0) { b.wins++; b.grossProfit += pnl }
    else if (pnl < 0) { b.losses++; b.grossLoss += Math.abs(pnl) }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, b]) => {
      const total = b.wins + b.losses
      const winRate = total > 0 ? b.wins / total : 0
      const avgWin = b.wins > 0 ? b.grossProfit / b.wins : 0
      const avgLoss = b.losses > 0 ? b.grossLoss / b.losses : 0
      const expectancy = winRate * avgWin - (1 - winRate) * avgLoss

      const label = granularity === 'monthly'
        ? (() => {
            const [y, m] = key.split('-')
            return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
          })()
        : key.replace('-', ' ')

      return { label, expectancy: Math.round(expectancy * 100) / 100, tradeCount: total }
    })
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'monthly'
    const sqnGranularity = (searchParams.get('granularity') || 'monthly') as 'weekly' | 'monthly'

    const now = new Date()
    let startDate: string | null = null
    if (timeframe === 'weekly') {
      const d = new Date(now); d.setDate(d.getDate() - 7); startDate = d.toISOString()
    } else if (timeframe === 'monthly') {
      const d = new Date(now); d.setDate(d.getDate() - 30); startDate = d.toISOString()
    } else if (timeframe === 'quarterly') {
      const d = new Date(now); d.setDate(d.getDate() - 90); startDate = d.toISOString()
    } else if (timeframe === 'yearly') {
      const d = new Date(now); d.setDate(d.getDate() - 365); startDate = d.toISOString()
    }

    // Fetch trades with journal + strategies
    let query = supabase
      .from('trades')
      .select(`
        *,
        trade_journal(*),
        trade_strategies(
          strategies(id, name, color)
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('open_time', { ascending: true })

    if (startDate) query = query.gte('open_time', startDate)

    const { data: rawTrades, error: dbErr } = await query
    if (dbErr) return NextResponse.json({ error: 'DATABASE_ERROR', message: dbErr.message }, { status: 500 })

    const trades = rawTrades || []
    const totalTrades = trades.length

    // ── 1. Core Metrics ─────────────────────────────────────────────────────
    let grossProfit = 0; let grossLoss = 0; let winCount = 0; let totalPnl = 0
    let totalActualRR = 0; let actualRRCount = 0
    const allRMultiples: number[] = []

    trades.forEach((t: any) => {
      const pnl = Number(t.pnl ?? 0)
      totalPnl += pnl
      if (pnl > 0) { grossProfit += pnl; winCount++ }
      else if (pnl < 0) { grossLoss += Math.abs(pnl) }

      const rr = computeTradeActualRR(t)
      if (rr !== null && !isNaN(rr)) {
        allRMultiples.push(rr)
        totalActualRR += rr
        actualRRCount++
      }
    })

    const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0)
    const avgActualRR = actualRRCount > 0 ? totalActualRR / actualRRCount : 0
    const lossCount = totalTrades - winCount
    const avgWin = winCount > 0 ? grossProfit / winCount : 0
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0
    const expectancy = ((winCount / (totalTrades || 1)) * avgWin) - ((lossCount / (totalTrades || 1)) * avgLoss)

    // Overall SQN
    const sqnResult = calculateSQN(allRMultiples)

    // ── 2. Equity Curve + rolling periodic overlay ───────────────────────────
    let cumulativePnl = 0; let peakEquity = 0; let maxDrawdownDollar = 0; let maxDrawdownPct = 0
    const equityCurve: Array<{ date: string; cumulativePnl: number; drawdownDollar: number; drawdownPct: number }> = []

    trades.forEach((t: any) => {
      const pnl = Number(t.pnl ?? 0)
      cumulativePnl += pnl
      if (cumulativePnl > peakEquity) peakEquity = cumulativePnl
      const ddDollar = peakEquity > cumulativePnl ? peakEquity - cumulativePnl : 0
      const ddPct = peakEquity > 0 ? (ddDollar / peakEquity) * 100 : 0
      if (ddDollar > maxDrawdownDollar) maxDrawdownDollar = ddDollar
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct
      const dateStr = new Date(t.open_time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      equityCurve.push({ date: dateStr, cumulativePnl: Math.round(cumulativePnl * 100) / 100, drawdownDollar: Math.round(ddDollar * 100) / 100, drawdownPct: Math.round(ddPct * 10) / 10 })
    })

    // ── 3. Periodic SQN & Expectancy Trend ──────────────────────────────────
    const sqnTrend = buildPeriodicSQN(trades, sqnGranularity)
    const expectancyTrend = buildPeriodicExpectancy(trades, sqnGranularity)

    // ── 4. MFE Distribution Histogram ────────────────────────────────────────
    // Compute MFE efficiency on-the-fly from mfe_value (peak price stored by EA sync)
    // mfe_percent column is intentionally left empty — only mfe_value is populated via MT5 sync
    const mfeValues: number[] = []
    trades.forEach((t: any) => {
      // Path 1: mfe_value from MT5 EA sync (most common)
      if (t.mfe_value !== null && t.mfe_value !== undefined && Number(t.mfe_value) > 0 && t.open_price && t.close_price) {
        const eff = calculateMFEPercent(
          Number(t.open_price),
          Number(t.close_price),
          Number(t.mfe_value),
          t.direction as 'buy' | 'sell'
        )
        if (eff !== null) mfeValues.push(eff)
      }
      // Path 2: mfe_percent from CSV import (if ever available)
      else if (t.mfe_percent !== null && t.mfe_percent !== undefined && Number(t.mfe_percent) > 0) {
        mfeValues.push(Number(t.mfe_percent))
      }
    })

    const premature = mfeValues.filter(v => v < 50).length
    const optimal = mfeValues.filter(v => v >= 50 && v <= 85).length
    const overheld = mfeValues.filter(v => v > 85).length
    const mfeTotal = mfeValues.length
    const avgMfePct = mfeTotal > 0 ? Math.round((mfeValues.reduce((a, b) => a + b, 0) / mfeTotal) * 10) / 10 : 0

    const mfeDistribution = {
      total: mfeTotal,
      avgPercent: avgMfePct,
      isSmallSample: mfeTotal < 20,
      categories: [
        { label: 'Premature Exit', key: 'premature', count: premature, pct: mfeTotal > 0 ? Math.round((premature / mfeTotal) * 100) : 0, description: 'MFE < 50% — Exit terlalu awal' },
        { label: 'Exit Optimal', key: 'optimal', count: optimal, pct: mfeTotal > 0 ? Math.round((optimal / mfeTotal) * 100) : 0, description: 'MFE 50–85% — Exit pada zona ideal' },
        { label: 'Overheld / Greed', key: 'overheld', count: overheld, pct: mfeTotal > 0 ? Math.round((overheld / mfeTotal) * 100) : 0, description: 'MFE > 85% — Tahan terlalu lama, berisiko reversal' },
      ],
    }

    // ── 5. Pair Ranking with SQN ──────────────────────────────────────────────
    const pairMap = new Map<string, { trades: any[]; wins: number; grossP: number; grossL: number; rMultiples: number[] }>()

    trades.forEach((t: any) => {
      const sym = String(t.symbol || 'UNKNOWN').toUpperCase()
      const pnl = Number(t.pnl ?? 0)
      const rr = computeTradeActualRR(t)

      if (!pairMap.has(sym)) pairMap.set(sym, { trades: [], wins: 0, grossP: 0, grossL: 0, rMultiples: [] })
      const entry = pairMap.get(sym)!
      entry.trades.push(t)
      if (pnl > 0) { entry.wins++; entry.grossP += pnl }
      else if (pnl < 0) { entry.grossL += Math.abs(pnl) }
      if (rr !== null && !isNaN(rr)) entry.rMultiples.push(rr)
    })

    const pairRanking = Array.from(pairMap.entries()).map(([symbol, d]) => {
      const count = d.trades.length
      const sqn = calculateSQN(d.rMultiples)
      const pf = d.grossL > 0 ? d.grossP / d.grossL : (d.grossP > 0 ? 999 : 0)
      const winRate = count > 0 ? (d.wins / count) * 100 : 0
      const lossC = count - d.wins
      const avgW = d.wins > 0 ? d.grossP / d.wins : 0
      const avgL = lossC > 0 ? d.grossL / lossC : 0
      const exp = (d.wins / (count || 1)) * avgW - (lossC / (count || 1)) * avgL

      return {
        symbol,
        tradeCount: count,
        winRate: Math.round(winRate * 10) / 10,
        profitFactor: Math.round(pf * 100) / 100,
        expectancy: Math.round(exp * 100) / 100,
        sqn: sqn.score,
        sqnRating: sqn.rating,
        sqnSampleCount: sqn.sampleCount,
        isSmallSample: count < 10,
        pnl: Math.round((d.grossP - d.grossL) * 100) / 100,
      }
    }).sort((a, b) => b.sqn - a.sqn)

    // ── 6. Strategy Ranking with SQN ─────────────────────────────────────────
    const strategyMap = new Map<string, { name: string; trades: any[]; wins: number; grossP: number; grossL: number; rMultiples: number[] }>()
    let tradesWithoutStrategy = 0

    trades.forEach((t: any) => {
      const strategies = (t.trade_strategies || []).map((ts: any) => ts.strategies).filter(Boolean)
      const pnl = Number(t.pnl ?? 0)
      const rr = computeTradeActualRR(t)

      if (strategies.length === 0) {
        tradesWithoutStrategy++
        return
      }

      for (const strat of strategies) {
        const key = strat.id
        if (!strategyMap.has(key)) strategyMap.set(key, { name: strat.name, trades: [], wins: 0, grossP: 0, grossL: 0, rMultiples: [] })
        const entry = strategyMap.get(key)!
        entry.trades.push(t)
        if (pnl > 0) { entry.wins++; entry.grossP += pnl }
        else if (pnl < 0) { entry.grossL += Math.abs(pnl) }
        if (rr !== null && !isNaN(rr)) entry.rMultiples.push(rr)
      }
    })

    const strategyRanking = Array.from(strategyMap.entries()).map(([id, d]) => {
      const count = d.trades.length
      const sqn = calculateSQN(d.rMultiples)
      const pf = d.grossL > 0 ? d.grossP / d.grossL : (d.grossP > 0 ? 999 : 0)
      const winRate = count > 0 ? (d.wins / count) * 100 : 0
      const lossC = count - d.wins
      const avgW = d.wins > 0 ? d.grossP / d.wins : 0
      const avgL = lossC > 0 ? d.grossL / lossC : 0
      const exp = (d.wins / (count || 1)) * avgW - (lossC / (count || 1)) * avgL

      return {
        id,
        name: d.name,
        tradeCount: count,
        winRate: Math.round(winRate * 10) / 10,
        profitFactor: Math.round(pf * 100) / 100,
        expectancy: Math.round(exp * 100) / 100,
        sqn: sqn.score,
        sqnRating: sqn.rating,
        sqnSampleCount: sqn.sampleCount,
        isSmallSample: count < 10,
        pnl: Math.round((d.grossP - d.grossL) * 100) / 100,
      }
    }).sort((a, b) => b.sqn - a.sqn)

    const strategyDataCompleteness = totalTrades > 0
      ? Math.round(((totalTrades - tradesWithoutStrategy) / totalTrades) * 100)
      : 0

    // ── 7. Psychology Cross Analysis ─────────────────────────────────────────
    const moodSqnMap = new Map<string, { rMultiples: number[]; wins: number; total: number; pnl: number }>()
    const MOOD_LABELS: Record<string, string> = {
      confident: 'Confident 😊', neutral: 'Neutral 😐', fomo: 'FOMO 😤',
      anxious: 'Cemas 😰', greedy: 'Serakah 🤑',
    }

    trades.forEach((t: any) => {
      const mood = t.trade_journal?.mood
      if (!mood) return
      const pnl = Number(t.pnl ?? 0)
      const rr = computeTradeActualRR(t)
      if (!moodSqnMap.has(mood)) moodSqnMap.set(mood, { rMultiples: [], wins: 0, total: 0, pnl: 0 })
      const entry = moodSqnMap.get(mood)!
      entry.total++
      entry.pnl += pnl
      if (pnl > 0) entry.wins++
      if (rr !== null && !isNaN(rr)) entry.rMultiples.push(rr)
    })

    const psychoCrossAnalysis = Array.from(moodSqnMap.entries()).map(([mood, d]) => {
      const sqn = calculateSQN(d.rMultiples)
      return {
        mood,
        label: MOOD_LABELS[mood] || mood,
        tradeCount: d.total,
        winRate: d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0,
        sqn: sqn.score,
        pnl: Math.round(d.pnl * 100) / 100,
      }
    }).sort((a, b) => b.sqn - a.sqn)

    // ── 8. Actionable Insights ────────────────────────────────────────────────
    const insights: Array<{ severity: 'critical' | 'warning' | 'positive'; title: string; observation: string; recommendation: string }> = []

    // SQN overall insight
    if (sqnResult.sampleCount >= 10) {
      if (sqnResult.score < 1.0) {
        insights.push({ severity: 'critical', title: 'Kualitas Sistem Kritis', observation: `SQN sistem Anda ${sqnResult.score.toFixed(2)} — di bawah ambang batas minimum (1.0).`, recommendation: 'Evaluasi ulang aturan entry & exit. Pertimbangkan paper trading untuk menguji perbaikan sebelum trading live.' })
      } else if (sqnResult.score < 2.0) {
        insights.push({ severity: 'warning', title: 'Kualitas Sistem Rata-Rata', observation: `SQN ${sqnResult.score.toFixed(2)} menunjukkan sistem trading masih dalam kategori rata-rata (1.0–2.0).`, recommendation: 'Fokus pada konsistensi eksekusi dan kurangi variasi hasil. Pertimbangkan mengoptimalkan aturan SL/TP.' })
      } else if (sqnResult.score >= 3.0) {
        insights.push({ severity: 'positive', title: 'Sistem Trading Sangat Kuat', observation: `SQN ${sqnResult.score.toFixed(2)} — sistem Anda masuk kategori "Very Good" menurut Van Tharp.`, recommendation: 'Pertahankan konsistensi. Pertimbangkan scale-up position size secara bertahap mengikuti compounding plan.' })
      } else {
        insights.push({ severity: 'positive', title: 'Kualitas Sistem Baik', observation: `SQN ${sqnResult.score.toFixed(2)} — sistem Anda profitable dan konsisten.`, recommendation: 'Terus jalankan sistem secara disiplin. Dokumentasikan setiap perubahan rule agar performa dapat dilacak.' })
      }
    }

    // MFE insight
    if (mfeTotal >= 10) {
      const prematurePct = mfeTotal > 0 ? (premature / mfeTotal) * 100 : 0
      if (prematurePct > 50) {
        insights.push({ severity: 'warning', title: 'Premature Exit Dominan', observation: `${Math.round(prematurePct)}% trade ditutup terlalu awal (MFE < 50%) — Anda sering meninggalkan profit di atas meja.`, recommendation: 'Pertimbangkan menggunakan trailing stop atau perluas target TP. Review kondisi market saat exit — apakah ada bias psikologis FOMO/cemas?' })
      } else if (avgMfePct >= 75) {
        insights.push({ severity: 'positive', title: 'Efisiensi Exit Sangat Baik', observation: `Rata-rata MFE ${avgMfePct}% — Anda konsisten menangkap sebagian besar potensi profit.`, recommendation: 'Pertahankan strategi exit saat ini. Dokumentasikan kondisi market terbaik untuk memaksimalkan MFE.' })
      }
    }

    // Psychology FOMO insight
    const fomoData = psychoCrossAnalysis.find(p => p.mood === 'fomo')
    const overallWinRate = winRate
    if (fomoData && fomoData.tradeCount >= 3 && fomoData.winRate < overallWinRate - 15) {
      insights.push({ severity: 'critical', title: 'FOMO Merusak Performa', observation: `Win rate saat FOMO ${fomoData.winRate}% — jauh di bawah rata-rata Anda (${Math.round(overallWinRate)}%).`, recommendation: 'Terapkan cooling-off period minimal 15 menit sebelum entry saat merasa FOMO. Dokumentasikan trigger FOMO di jurnal.' })
    }

    // Profit factor insight
    if (profitFactor < 1.0 && totalTrades >= 10) {
      insights.push({ severity: 'critical', title: 'Profit Factor di Bawah 1.0', observation: `Profit Factor ${profitFactor.toFixed(2)} — sistem merugi secara keseluruhan pada periode ini.`, recommendation: 'Evaluasi apakah ada bias pada pasangan mata uang atau waktu trading tertentu. Pertimbangkan pause trading untuk review mendalam.' })
    } else if (profitFactor >= 1.5 && totalTrades >= 10) {
      insights.push({ severity: 'positive', title: 'Profit Factor Sehat', observation: `Profit Factor ${profitFactor.toFixed(2)} — sistem Anda menghasilkan ${profitFactor.toFixed(1)}x dari setiap kerugian.`, recommendation: 'Pertahankan konsistensi risk management. Pastikan tidak ada over-trading yang dapat merusak angka ini.' })
    }

    // SQN trend declining
    if (sqnTrend.length >= 2) {
      const last = sqnTrend[sqnTrend.length - 1]
      const prev = sqnTrend[sqnTrend.length - 2]
      if (prev.sqn >= 2.0 && last.sqn < 1.5 && !last.isSmallSample) {
        insights.push({ severity: 'warning', title: 'Kualitas Sistem Menurun', observation: `SQN turun dari ${prev.sqn.toFixed(2)} (${prev.label}) menjadi ${last.sqn.toFixed(2)} (${last.label}).`, recommendation: 'Cek apakah ada perubahan kondisi market, atau pelanggaran aturan trading. Pertimbangkan mengurangi size sementara.' })
      }
    }

    // Sort insights: critical first, then warning, then positive
    const severityOrder = { critical: 0, warning: 1, positive: 2 }
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    return NextResponse.json({
      success: true,
      timeframe,
      sqnGranularity,
      metrics: {
        totalTrades,
        winRate: Math.round(winRate * 10) / 10,
        profitFactor: Math.round(profitFactor * 100) / 100,
        expectancy: Math.round(expectancy * 100) / 100,
        avgActualRR: Math.round(avgActualRR * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        maxDrawdownDollar: Math.round(maxDrawdownDollar * 100) / 100,
        maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
      },
      sqnOverall: { score: sqnResult.score, rating: sqnResult.rating, sampleCount: sqnResult.sampleCount },
      equityCurve,
      sqnTrend,
      expectancyTrend,
      mfeDistribution,
      pairRanking,
      strategyRanking,
      strategyDataCompleteness,
      psychoCrossAnalysis,
      insights,
    })
  } catch (err: any) {
    console.error('Analysis Deep API error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 })
  }
}
