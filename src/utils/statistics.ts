/**
 * statistics.ts
 * Utility functions for trading performance calculations.
 * All functions are pure (no side effects) and handle edge cases gracefully.
 */

export interface TradeStat {
  pnl:        number | null
  status:     'open' | 'closed'
  close_time: string | null
  open_time:  string
  actual_rr?: number | null
}

// ── Win Rate ──────────────────────────────────────────────────
/**
 * Win Rate = (Jumlah trade profit / Total trade closed) × 100
 * Hanya menghitung trade yang sudah closed dan punya PnL.
 */
export function calculateWinRate(trades: TradeStat[]): number {
  const closed = trades.filter((t) => t.status === 'closed' && t.pnl !== null)
  if (closed.length === 0) return 0
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length
  return (wins / closed.length) * 100
}

// ── Profit Factor ─────────────────────────────────────────────
/**
 * Profit Factor = Total gross profit / |Total gross loss|
 * Nilai > 1.0 artinya strategi profitable secara keseluruhan.
 * Return 0 jika tidak ada loss (hindari division by zero).
 */
export function calculateProfitFactor(trades: TradeStat[]): number {
  const closed = trades.filter((t) => t.status === 'closed' && t.pnl !== null)
  let grossProfit = 0
  let grossLoss   = 0

  for (const t of closed) {
    const pnl = t.pnl ?? 0
    if (pnl > 0) grossProfit += pnl
    else grossLoss += Math.abs(pnl)
  }

  if (grossLoss === 0) return grossProfit > 0 ? 999 : 0 // Perfect PF atau 0 trade
  return grossProfit / grossLoss
}

// ── Average R:R ───────────────────────────────────────────────
/**
 * Average Actual R:R = Rata-rata actual_rr dari jurnal yang terisi.
 * Hanya trade dengan actual_rr yang diisi di jurnal yang dihitung.
 */
export function calculateAvgRR(trades: Array<TradeStat & { actual_rr?: number | null }>): number {
  const withRR = trades.filter((t) => t.actual_rr !== null && t.actual_rr !== undefined)
  if (withRR.length === 0) return 0
  const total = withRR.reduce((sum, t) => sum + (t.actual_rr ?? 0), 0)
  return total / withRR.length
}

// ── Max Win / Loss Streak ─────────────────────────────────────
/**
 * Max Streak = jumlah consecutive win (atau loss) terpanjang.
 * Trades diurutkan berdasarkan close_time ascending sebelum dihitung.
 */
export function calculateMaxStreak(
  trades: TradeStat[],
  type: 'win' | 'loss'
): number {
  const closed = trades
    .filter((t) => t.status === 'closed' && t.pnl !== null && t.close_time !== null)
    .sort((a, b) => new Date(a.close_time!).getTime() - new Date(b.close_time!).getTime())

  if (closed.length === 0) return 0

  let maxStreak     = 0
  let currentStreak = 0

  for (const t of closed) {
    const isWin = (t.pnl ?? 0) > 0
    const match = type === 'win' ? isWin : !isWin

    if (match) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  }

  return maxStreak
}

// ── Total PnL ─────────────────────────────────────────────────
/**
 * Sum of all closed trade PnL values (excluding commission/swap separately).
 */
export function calculateTotalPnl(trades: TradeStat[]): number {
  return trades
    .filter((t) => t.status === 'closed' && t.pnl !== null)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0)
}

// ── Group by Day ──────────────────────────────────────────────
/**
 * Groups closed trades by calendar date (YYYY-MM-DD).
 * Returns a map: { date → { pnl: number, count: number } }
 */
export function groupByDay(trades: TradeStat[]): Map<string, { pnl: number; count: number }> {
  const map = new Map<string, { pnl: number; count: number }>()

  for (const t of trades) {
    if (t.status !== 'closed' || t.pnl === null) continue
    const dateRaw = t.close_time || t.open_time
    if (!dateRaw) continue
    const date = dateRaw.includes('T') ? dateRaw.split('T')[0] : dateRaw.split(' ')[0]
    const prev = map.get(date) ?? { pnl: 0, count: 0 }
    map.set(date, { pnl: prev.pnl + (t.pnl ?? 0), count: prev.count + 1 })
  }

  return map
}

// ── Group by Week ─────────────────────────────────────────────
/**
 * Groups closed trades by ISO week number within a month.
 * Week boundaries are calculated from the first day of the month.
 */
export function groupByWeek(
  trades: TradeStat[],
  year: number,
  month: number // 1-indexed
): Array<{ weekNumber: number; startDate: string; endDate: string; pnl: number; tradesCount: number }> {
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const lastDay  = new Date(Date.UTC(year, month, 0, 23, 59, 59))

  // Build week buckets (each week starts on Mon or first of month)
  const weeks: Array<{ start: Date; end: Date }> = []
  let cursor = new Date(firstDay)

  while (cursor <= lastDay) {
    // Find end of this week (Sunday or last day of month)
    const dayOfWeek = cursor.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
    const daysUntilSun = dayOfWeek === 0 ? 0 : 7 - dayOfWeek
    const weekEnd = new Date(Math.min(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + daysUntilSun, 23, 59, 59),
      lastDay.getTime()
    ))
    weeks.push({ start: new Date(cursor), end: new Date(weekEnd) })
    cursor = new Date(Date.UTC(weekEnd.getUTCFullYear(), weekEnd.getUTCMonth(), weekEnd.getUTCDate() + 1))
  }

  return weeks.map((w, idx) => {
    const weekTrades = trades.filter((t) => {
      if (t.status !== 'closed' || t.pnl === null) return false
      const dateRaw = t.close_time || t.open_time
      if (!dateRaw) return false
      const d = new Date(dateRaw)
      return d >= w.start && d <= w.end
    })

    const pnl = weekTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)

    return {
      weekNumber:  idx + 1,
      startDate:   w.start.toISOString().split('T')[0],
      endDate:     w.end.toISOString().split('T')[0],
      pnl:         Math.round(pnl * 100) / 100,
      tradesCount: weekTrades.length,
    }
  })
}

// ── Group by Symbol ───────────────────────────────────────────
/**
 * Groups closed trades by symbol and computes stats per symbol.
 */
export function groupBySymbol(
  trades: Array<TradeStat & { symbol: string }>
): Array<{ symbol: string; trades: number; wins: number; losses: number; winRate: number; pnl: number }> {
  const map = new Map<string, { trades: number; wins: number; losses: number; pnl: number }>()

  for (const t of trades) {
    if (t.status !== 'closed' || t.pnl === null) continue
    const prev = map.get(t.symbol) ?? { trades: 0, wins: 0, losses: 0, pnl: 0 }
    const isWin = (t.pnl ?? 0) > 0
    map.set(t.symbol, {
      trades: prev.trades + 1,
      wins:   prev.wins + (isWin ? 1 : 0),
      losses: prev.losses + (isWin ? 0 : 1),
      pnl:    prev.pnl + (t.pnl ?? 0),
    })
  }

  return Array.from(map.entries())
    .map(([symbol, stats]) => ({
      symbol,
      trades:  stats.trades,
      wins:    stats.wins,
      losses:  stats.losses,
      winRate: stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0,
      pnl:     Math.round(stats.pnl * 100) / 100,
    }))
    .sort((a, b) => b.pnl - a.pnl) // Sort by PnL descending
}

// ── Best / Worst Day ──────────────────────────────────────────
/**
 * Finds the day with highest and lowest total PnL.
 */
export function findBestWorstDay(
  dayMap: Map<string, { pnl: number; count: number }>
): { bestDay: { date: string; pnl: number } | null; worstDay: { date: string; pnl: number } | null } {
  if (dayMap.size === 0) return { bestDay: null, worstDay: null }

  let bestDay:  { date: string; pnl: number } | null = null
  let worstDay: { date: string; pnl: number } | null = null

  for (const [date, { pnl }] of dayMap) {
    if (bestDay === null || pnl > bestDay.pnl)   bestDay  = { date, pnl }
    if (worstDay === null || pnl < worstDay.pnl) worstDay = { date, pnl }
  }

  return { bestDay, worstDay }
}

// ── Most Trades Day ───────────────────────────────────────────
export function findMostTradesDay(
  dayMap: Map<string, { pnl: number; count: number }>
): { date: string; count: number } | null {
  if (dayMap.size === 0) return null

  let result: { date: string; count: number } | null = null
  for (const [date, { count }] of dayMap) {
    if (result === null || count > result.count) result = { date, count }
  }
  return result
}
