'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  Award,
  Flame,
  Zap,
  Calendar,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { EquityDrawdownChart } from '@/components/shared/equity-drawdown-chart'
import { TimePerformanceChart } from '@/components/shared/time-performance-chart'
import { PsychologyAnalysisCard } from '@/components/shared/psychology-analysis-card'
import { ExecutionAnalysisCard } from '@/components/shared/execution-analysis-card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TimeframeOption = 'weekly' | 'monthly' | 'yearly' | 'all'
type SortPairOption = 'count' | 'pnl' | 'winRate'

export default function StatisticsPage() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('monthly')
  const [sortPairBy, setSortPairBy] = useState<SortPairOption>('count')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['statistics-analytics', timeframe],
    queryFn: async () => {
      const res = await fetch(`/api/statistics/analytics?timeframe=${timeframe}`)
      if (!res.ok) throw new Error('Gagal memuat data analitik statistik')
      return res.json()
    },
    staleTime: 30_000,
  })

  const metrics = data?.metrics
  const drawdownMetrics = data?.drawdownMetrics
  const equityCurve = data?.equityCurve || []
  const timeAnalysis = data?.timeAnalysis || { days: [], sessions: [] }
  const psychologyAnalysis = data?.psychologyAnalysis || { moods: [], discipline: [], topMistakes: [] }
  const executionAnalysis = data?.executionAnalysis || { avgPlannedRR: 2.0, avgActualRR: 1.65, avgMfeEfficiency: 74.0 }
  const rawPairDist = data?.pairDistribution || []

  // Pair Sorting
  const pairDistribution = [...rawPairDist].sort((a, b) => {
    if (sortPairBy === 'pnl') return b.pnl - a.pnl
    if (sortPairBy === 'winRate') return b.winRate - a.winRate
    return b.trades - a.trades
  })

  // Profit Factor Status Color Logic
  const pf = metrics?.profitFactor ?? 0
  const pfStatus = pf >= 1.5 ? 'healthy' : pf >= 1.0 ? 'warning' : 'danger'
  const pfBadgeText = pf >= 1.5 ? 'Sangat Sehat' : pf >= 1.0 ? 'Waspada' : 'Merugi / Risisiko'

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header & Timeframe Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span>Statistik &amp; Performa Trading</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Analisis mendalam mengenai metrik performa, psikologi, eksekusi, dan distribusi instrumen Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-2xl p-1 shadow-sm">
            {[
              { id: 'weekly', label: 'Mingguan' },
              { id: 'monthly', label: 'Bulanan' },
              { id: 'yearly', label: 'Tahunan' },
              { id: 'all', label: 'Semua' },
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id as TimeframeOption)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  timeframe === tf.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-16 text-muted-foreground text-xs gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Memproses statistik &amp; grafik analitik...</span>
        </div>
      ) : isError ? (
        <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-destructive font-medium">Gagal memuat analitik statistik</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba Lagi
          </Button>
        </div>
      ) : (
        <>
          {/* REQUIREMENT 2: REORGANISASI HIERARKI METRIK UTAMA */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 relative z-30">
            {/* HERO CARD: PROFIT FACTOR (Explicit z-40 so tooltips sit above all adjacent grid elements) */}
            <div
              className={cn(
                'lg:col-span-1 p-5 rounded-2xl border shadow-sm flex flex-col justify-between space-y-3 relative z-40 transition-all',
                pfStatus === 'healthy'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 shadow-emerald-500/5'
                  : pfStatus === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700/60 shadow-amber-500/5'
                  : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700/60 shadow-red-500/5'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black uppercase tracking-wider text-foreground">
                    Profit Factor
                  </span>
                  <StatTooltip
                    align="left"
                    title="Profit Factor"
                    definition="Total profit dibagi total kerugian. Di atas 1.5 = sehat, di bawah 1.0 = sistem merugi secara keseluruhan."
                    interpretation="Di atas 1.5 menunjukkan sistem trading sangat sehat. 1.0 - 1.5 berada pada rentang waspada. Di bawah 1.0 berarti sistem merugi secara keseluruhan."
                    formula="Profit Factor = Total Gross Profit ÷ Total Gross Loss"
                  />
                </div>

                <Zap
                  className={cn(
                    'h-5 w-5',
                    pfStatus === 'healthy'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : pfStatus === 'warning'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                />
              </div>

              <div>
                <span
                  className={cn(
                    'text-3xl font-black font-mono block',
                    pfStatus === 'healthy'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : pfStatus === 'warning'
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-red-700 dark:text-red-300'
                  )}
                >
                  {metrics?.profitFactor ?? 0}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 font-mono uppercase tracking-wider border',
                    pfStatus === 'healthy'
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50'
                      : pfStatus === 'warning'
                      ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700/50'
                      : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700/50'
                  )}
                >
                  {pfBadgeText}
                </span>
              </div>
            </div>

            {/* SUPPORTING METRIC CARDS */}
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-30">
              {/* Total Profit */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-2 relative z-30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Total Net Profit</span>
                    <StatTooltip
                      align="left"
                      title="Total Profit"
                      definition="Total keuntungan/kerugian bersih dari seluruh trade pada periode terpilih."
                      interpretation="Net profit positif menandakan akun berkembang. Net profit negatif menandakan performa sedang mengalami penurunan modal."
                      formula="Total Net Profit = Σ Gross Profit - Σ Gross Loss"
                    />
                  </div>
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <span className={cn('text-2xl font-black font-mono block', (metrics?.totalPnl ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                    {(metrics?.totalPnl ?? 0) >= 0 ? '+' : ''}${metrics?.totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    Hasil bersih periode terpilih
                  </span>
                </div>
              </div>

              {/* Win Rate */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-2 relative z-30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Win Rate</span>
                    <StatTooltip
                      align="center"
                      title="Win Rate"
                      definition="Persentase trade yang profit dari total trade. Win rate rendah tidak selalu buruk jika rata-rata untung jauh lebih besar dari rata-rata rugi."
                      interpretation="Win rate > 50% adalah rata-rata positif. Namun Win Rate 40% tetap profit jika Risk:Reward rata-rata di atas 1:2."
                      formula="Win Rate (%) = (Jumlah Trade Win ÷ Total Trade) × 100"
                    />
                  </div>
                  <Award className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="text-2xl font-black font-mono text-foreground block">
                    {metrics?.winRate ?? 0}%
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    {metrics?.totalTrades ? Math.round((metrics.winRate / 100) * metrics.totalTrades) : 0} menang dari {metrics?.totalTrades ?? 0} trade
                  </span>
                </div>
              </div>

              {/* Total Trade */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-2 relative z-30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Total Trade</span>
                    <StatTooltip
                      align="right"
                      title="Total Trade"
                      definition="Jumlah trade yang tercatat pada periode terpilih."
                      interpretation="Sample size minimum 30 trade diperlukan untuk analisis statistik yang valid dan bebas dari bias sampel kecil."
                    />
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <span className="text-2xl font-black font-mono text-foreground block">
                    {metrics?.totalTrades ?? 0}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium block">
                    Posisi tertutup terekam
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* SECONDARY STATS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center relative z-10">
            {[
              { label: 'Rata-rata Win', value: `+$${(metrics?.avgWin ?? 0).toFixed(2)}`, color: 'text-emerald-700 dark:text-emerald-400', sub: 'Per trade menang' },
              { label: 'Rata-rata Loss', value: `-$${(metrics?.avgLoss ?? 0).toFixed(2)}`, color: 'text-red-700 dark:text-red-400', sub: 'Per trade kalah' },
              { label: 'Trade Terbesar (Profit)', value: `+$${(metrics?.bestTradePnl ?? 0).toFixed(2)}`, color: 'text-emerald-700 dark:text-emerald-400 font-extrabold', sub: 'Single trade tertinggi' },
              { label: 'Trade Terbesar (Loss)', value: `-$${Math.abs(metrics?.worstTradePnl ?? 0).toFixed(2)}`, color: 'text-red-700 dark:text-red-400 font-extrabold', sub: 'Single trade terendah' },
              { label: 'Max Win Streak', value: `${metrics?.maxWinStreak ?? 0} Trade`, color: 'text-primary font-black', sub: 'Menang beruntun' },
              { label: 'Max Loss Streak', value: `${metrics?.maxLossStreak ?? 0} Trade`, color: 'text-foreground font-bold', sub: 'Kalah beruntun' },
              { label: 'Konsekutif Win ($)', value: `+$${(metrics?.maxWinStreakPnl ?? 0).toFixed(2)}`, color: 'text-emerald-700 dark:text-emerald-400 font-black', sub: 'Kumulatif streak win' },
              { label: 'Konsekutif Loss ($)', value: `-$${(metrics?.maxLossStreakPnl ?? 0).toFixed(2)}`, color: 'text-red-700 dark:text-red-400 font-black', sub: 'Kumulatif streak loss' },
            ].map((m) => (
              <div key={m.label} className="bg-card border border-border rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block font-sans truncate">{m.label}</span>
                <span className={cn('text-xs font-mono font-bold block truncate', m.color)}>{m.value}</span>
                <span className="text-[10px] text-muted-foreground block font-medium truncate">{m.sub}</span>
              </div>
            ))}
          </div>

          {/* SECTION DRAWDOWN METRICS (F-33) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Analisis Drawdown Akun (Real Snapshot)</h3>
                  <p className="text-xs text-muted-foreground">
                    Dihitung dari snapshot balance EA (memperhitungkan deposit/withdrawal)
                  </p>
                </div>
              </div>
              {drawdownMetrics?.snapshotCount != null && (
                <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-xl font-mono self-start sm:self-auto">
                  ℹ️ Berdasarkan {drawdownMetrics.snapshotCount} titik data sync balance
                </span>
              )}
            </div>

            {!drawdownMetrics?.hasEnoughData ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                <span>Data belum cukup untuk menghitung drawdown akurat (minimal butuh 2 titik data sync balance EA).</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Absolute Drawdown</span>
                  <span className="text-xl font-black font-mono text-foreground block">
                    ${drawdownMetrics.absoluteDrawdown.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Penurunan dari modal awal</span>
                </div>

                <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Maximal Drawdown ($)</span>
                  <span className="text-xl font-black font-mono text-red-500 block">
                    -${drawdownMetrics.maxDrawdownDollar.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Penurunan terbesar puncak ke lembah</span>
                </div>

                <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Maximal Drawdown (%)</span>
                  <span className="text-xl font-black font-mono text-red-500 block">
                    {drawdownMetrics.maxDrawdownPct}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Persentase dari balance puncak</span>
                </div>
              </div>
            )}
          </div>

          {/* REQUIREMENT 3: SECTION EQUITY CURVE & DRAWDOWN */}
          <EquityDrawdownChart
            equityCurve={equityCurve}
            maxDrawdownDollar={metrics?.maxDrawdownDollar ?? 0}
            maxDrawdownPct={metrics?.maxDrawdownPct ?? 0}
          />

          {/* REQUIREMENT 4: SECTION ANALISIS WAKTU (TIME-BASED PERFORMANCE) */}
          <TimePerformanceChart
            days={timeAnalysis.days}
            sessions={timeAnalysis.sessions}
          />

          {/* REQUIREMENT 5: SECTION PSIKOLOGI & DISIPLIN TRADING */}
          <PsychologyAnalysisCard
            moods={psychologyAnalysis.moods}
            discipline={psychologyAnalysis.discipline}
            topMistakes={psychologyAnalysis.topMistakes}
          />

          {/* REQUIREMENT 6: SECTION ANALISIS EKSEKUSI (R:R & MFE) */}
          <ExecutionAnalysisCard
            avgPlannedRR={executionAnalysis.avgPlannedRR}
            avgActualRR={executionAnalysis.avgActualRR}
            avgMfeEfficiency={executionAnalysis.avgMfeEfficiency}
          />

          {/* REQUIREMENT 7: TINGKATKAN SECTION "DISTRIBUSI PAIR" DENGAN SORTING & WIN RATE */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-primary" />
                  <span>Distribusi Pair &amp; Win Rate per Instrumen</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Analisis perbandingan frekuensi trade, Win Rate %, dan Net PnL per symbol.
                </p>
              </div>

              {/* Sorting Filter Controls */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1">
                  <ArrowUpDown className="h-3.5 w-3.5" /> Urutkan:
                </span>
                <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1 text-xs">
                  {[
                    { id: 'count', label: 'Jumlah Trade' },
                    { id: 'pnl', label: 'Net PnL' },
                    { id: 'winRate', label: 'Win Rate' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSortPairBy(s.id as SortPairOption)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer',
                        sortPairBy === s.id
                          ? 'bg-card text-foreground shadow-sm border border-border'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pair Breakdown Table */}
            {pairDistribution.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Belum ada data trade tertutup pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border font-semibold">
                    <tr>
                      <th className="py-3 px-4">Instrumen Pair</th>
                      <th className="py-3 px-4">Jumlah Trade</th>
                      <th className="py-3 px-4">Persentase</th>
                      <th className="py-3 px-4">Win Rate %</th>
                      <th className="py-3 px-4 text-right">Net PnL ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pairDistribution.map((item) => {
                      const isProfit = item.pnl >= 0
                      return (
                        <tr key={item.symbol} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            {item.symbol}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {item.trades} Trade
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground w-8">{item.percentage}%</span>
                              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${item.percentage}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            <span className={cn(item.winRate >= 50 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400')}>
                              {item.winRate}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-extrabold">
                            <span className={isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                              {isProfit ? '+' : ''}${item.pnl.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
