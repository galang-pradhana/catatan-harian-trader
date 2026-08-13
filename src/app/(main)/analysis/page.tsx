'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Lightbulb,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Brain,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { MfeCard } from '@/components/shared/mfe-card'
import { SqnCard } from '@/components/shared/sqn-card'
import { EquityQualityChart } from '@/components/shared/equity-quality-chart'
import { SqnTrendChart } from '@/components/shared/sqn-trend-chart'
import { MfeHistogramChart } from '@/components/shared/mfe-histogram-chart'
import { PairRankingTable } from '@/components/shared/pair-ranking-table'
import { StrategyRankingTable } from '@/components/shared/strategy-ranking-table'
import { PipsAnalyticsTab } from '@/components/shared/pips-analytics-tab'

type ActiveTab = 'overview' | 'sqn_mfe' | 'pair' | 'strategy' | 'pips'
type TimeframeOption = 'monthly' | 'quarterly' | 'yearly' | 'all'
type SqnGranularity = 'weekly' | 'monthly'

const INSIGHT_CONFIG = {
  positive: {
    icon: CheckCircle2,
    labelClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700/50',
    cardClass: 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40',
    label: '✓ Positif',
  },
  warning: {
    icon: AlertTriangle,
    labelClass: 'text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/50',
    cardClass: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40',
    label: '⚠ Perlu Perhatian',
  },
  critical: {
    icon: XCircle,
    labelClass: 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-700/50',
    cardClass: 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40',
    label: '✕ Kritis',
  },
}

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [timeframe, setTimeframe] = useState<TimeframeOption>('monthly')
  const [sqnGranularity, setSqnGranularity] = useState<SqnGranularity>('monthly')
  const [showAllInsights, setShowAllInsights] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['analysis-deep', timeframe, sqnGranularity],
    queryFn: async () => {
      const res = await fetch(`/api/analysis/deep?timeframe=${timeframe}&granularity=${sqnGranularity}`)
      if (!res.ok) throw new Error('Gagal memuat data analisis mendalam')
      return res.json()
    },
    staleTime: 60_000,
  })

  const metrics = data?.metrics
  const sqnOverall = data?.sqnOverall
  const equityCurve = data?.equityCurve || []
  const sqnTrend = data?.sqnTrend || []
  const expectancyTrend = data?.expectancyTrend || []
  const mfeDistribution = data?.mfeDistribution || { total: 0, avgPercent: 0, isSmallSample: true, categories: [] }
  const pairRanking = data?.pairRanking || []
  const strategyRanking = data?.strategyRanking || []
  const strategyDataCompleteness = data?.strategyDataCompleteness ?? 0
  const psychoCrossAnalysis = data?.psychoCrossAnalysis || []
  const allInsights: any[] = data?.insights || []
  const displayedInsights = showAllInsights ? allInsights : allInsights.slice(0, 5)

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Lightbulb className="h-5 w-5" />
            </div>
            <span>Analisis Performa &amp; Kualitas Sistem</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Evaluasi statistik mendalam: apakah sistem trading Anda valid &amp; konsisten secara statistik?
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-2xl p-1 shadow-sm">
            {([
              { id: 'monthly',   label: 'Bulanan' },
              { id: 'quarterly', label: 'Triwulan' },
              { id: 'yearly',    label: 'Tahunan' },
              { id: 'all',       label: 'Semua' },
            ] as { id: TimeframeOption; label: string }[]).map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  timeframe === tf.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
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

      {/* Sub-tabs Navigation */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-2xl p-1 shadow-sm overflow-x-auto w-fit">
        {([
          { id: 'overview',  label: 'Overview' },
          { id: 'sqn_mfe',   label: 'SQN & MFE Analytics' },
          { id: 'pips',      label: '📊 Analitik Pips' },
          { id: 'pair',      label: 'Pair / Simbol' },
          { id: 'strategy',  label: 'Strategi' },
        ] as { id: ActiveTab; label: string }[]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-16 text-muted-foreground text-xs gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Menghitung SQN, MFE, dan analisis kualitas sistem...</span>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-destructive font-medium">Gagal memuat data analisis mendalam</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba Lagi
          </Button>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && data && (
        <>
          {/* ── TAB: OVERVIEW ─────────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Row — 4 Cards with StatTooltip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-30">
                {[
                  {
                    label: 'Win Rate',
                    value: `${metrics?.winRate ?? 0}%`,
                    color: 'text-foreground',
                    tooltip: {
                      title: 'Win Rate',
                      definition: 'Persentase trade profit dari total trade. Perlu dilihat bersamaan dengan Avg R:R karena win rate rendah bisa tetap profitable jika reward per trade besar.',
                      interpretation: 'Win rate >50% adalah rata-rata positif. Namun Win Rate 40% tetap profit jika Risk:Reward rata-rata di atas 1:2.',
                      formula: 'Win Rate (%) = (Trade Win / Total Trade) × 100',
                    },
                  },
                  {
                    label: 'Profit Factor',
                    value: `${metrics?.profitFactor ?? 0}`,
                    color: (metrics?.profitFactor ?? 0) >= 1.5 ? 'text-emerald-700 dark:text-emerald-400' : (metrics?.profitFactor ?? 0) >= 1.0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400',
                    tooltip: {
                      title: 'Profit Factor',
                      definition: 'Total gross profit dibagi total gross loss. Di atas 1.5 = sehat, di bawah 1.0 = sistem merugi.',
                      interpretation: 'Di atas 1.5 menunjukkan sistem sangat sehat. 1.0–1.5 pada rentang waspada. Di bawah 1.0 = sistem merugi secara keseluruhan.',
                      formula: 'Profit Factor = Total Gross Profit ÷ Total Gross Loss',
                    },
                  },
                  {
                    label: 'Expectancy',
                    value: `${(metrics?.expectancy ?? 0) >= 0 ? '+' : ''}$${(metrics?.expectancy ?? 0).toFixed(2)}`,
                    color: (metrics?.expectancy ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-mono' : 'text-red-700 dark:text-red-400 font-mono',
                    tooltip: {
                      title: 'Expectancy',
                      definition: 'Ekspektasi untung/rugi rata-rata per trade. Angka positif berarti secara statistik sistem Anda menghasilkan profit dalam jangka panjang jika dijalankan konsisten.',
                      interpretation: 'Expectancy positif = sistem valid secara statistik. Semakin besar nilainya, semakin kuat edge Anda.',
                      formula: 'Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)',
                    },
                  },
                  {
                    label: 'Avg R:R Aktual',
                    value: `1 : ${(metrics?.avgActualRR ?? 0).toFixed(2)}`,
                    color: 'text-foreground font-mono',
                    tooltip: {
                      title: 'Avg R:R (Reward:Risk)',
                      definition: 'Rata-rata rasio risk-reward aktual dari seluruh trade tertutup, dihitung dari harga entry, SL, dan harga close sebenarnya.',
                      interpretation: 'Avg R:R aktual >1.5 = eksekusi sudah konsisten mengambil profit lebih dari risiko. Angka lebih rendah dari rencana perlu evaluasi.',
                    },
                  },
                ].map(item => (
                  <div key={item.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1 relative z-30">
                    <div className="flex items-center gap-0.5 text-xs font-semibold text-muted-foreground">
                      <span>{item.label}</span>
                      <StatTooltip
                        title={item.tooltip.title}
                        definition={item.tooltip.definition}
                        interpretation={item.tooltip.interpretation}
                        formula={item.tooltip.formula}
                        position="auto"
                      />
                    </div>
                    <span className={cn('text-2xl font-extrabold block', item.color)}>{item.value}</span>
                    <span className="text-[11px] text-muted-foreground block">
                      {item.label === 'Win Rate' && `${metrics?.totalTrades ?? 0} trade tertutup`}
                      {item.label === 'Profit Factor' && ((metrics?.profitFactor ?? 0) >= 1.5 ? 'Sangat Sehat ✓' : (metrics?.profitFactor ?? 0) >= 1.0 ? 'Waspada ⚠' : 'Merugi ✕')}
                      {item.label === 'Expectancy' && 'Ekspektasi PnL per trade'}
                      {item.label === 'Avg R:R Aktual' && 'Rata-rata aktual dari jurnal'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Equity Curve + Quality Overlay */}
              <EquityQualityChart
                equityCurve={equityCurve}
                sqnTrend={sqnTrend}
                expectancyTrend={expectancyTrend}
              />

              {/* Insights Panel */}
              <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                    <div>
                      <h3 className="text-sm font-bold text-foreground">Insights &amp; Rekomendasi</h3>
                      <p className="text-xs text-muted-foreground">Analisis otomatis berdasarkan data trading Anda</p>
                    </div>
                  </div>
                  {allInsights.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {(['critical', 'warning', 'positive'] as const).map(sev => {
                        const count = allInsights.filter(i => i.severity === sev).length
                        if (count === 0) return null
                        const cfg = INSIGHT_CONFIG[sev]
                        return (
                          <span key={sev} className={cn('px-1.5 py-0.5 rounded-full border text-[10px] font-bold', cfg.labelClass)}>
                            {count} {sev === 'critical' ? 'Kritis' : sev === 'warning' ? 'Perhatian' : 'Positif'}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {allInsights.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Belum cukup data trade untuk menghasilkan insight. Lanjutkan mencatat jurnal trade Anda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedInsights.map((insight: any, idx: number) => {
                      const cfg = INSIGHT_CONFIG[insight.severity as keyof typeof INSIGHT_CONFIG]
                      const Icon = cfg.icon
                      return (
                        <div key={idx} className={cn('p-4 rounded-2xl border space-y-2', cfg.cardClass)}>
                          <div className="flex items-start gap-3">
                            <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', insight.severity === 'critical' ? 'text-red-600 dark:text-red-400' : insight.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')} />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs font-bold text-foreground">{insight.title}</h4>
                                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide', cfg.labelClass)}>
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.observation}</p>
                            </div>
                          </div>
                          {/* Recommendation */}
                          <div className="ml-7 pl-3 border-l-2 border-current/20">
                            <p className="text-[11px] font-semibold text-foreground leading-relaxed">
                              💡 {insight.recommendation}
                            </p>
                          </div>
                        </div>
                      )
                    })}

                    {allInsights.length > 5 && (
                      <button
                        onClick={() => setShowAllInsights(prev => !prev)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-primary font-bold hover:underline py-1"
                      >
                        {showAllInsights ? (
                          <><ChevronUp className="h-3.5 w-3.5" /> Sembunyikan</>
                        ) : (
                          <><ChevronDown className="h-3.5 w-3.5" /> Lihat semua {allInsights.length} insight →</>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB: SQN & MFE ANALYTICS ─────────────────────────────────────── */}
          {activeTab === 'sqn_mfe' && (
            <div className="space-y-6">
              {/* SQN + MFE summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MfeCard efficiencyPercent={mfeDistribution.avgPercent} excludedCount={0} />
                <SqnCard sqnScore={sqnOverall?.score ?? 0} sampleCount={sqnOverall?.sampleCount ?? 0} />
              </div>

              {/* SQN Granularity toggle */}
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-sm">
                <span className="text-xs text-muted-foreground font-semibold shrink-0">Granularitas SQN:</span>
                <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1">
                  {([
                    { id: 'weekly', label: 'Per Minggu' },
                    { id: 'monthly', label: 'Per Bulan' },
                  ] as { id: SqnGranularity; label: string }[]).map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSqnGranularity(opt.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                        sqnGranularity === opt.id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  Pilih granularitas periode untuk menghitung rolling SQN
                </span>
              </div>

              {/* SQN Trend Chart */}
              <SqnTrendChart data={sqnTrend} />

              {/* MFE Histogram */}
              <MfeHistogramChart distribution={mfeDistribution} />

              {/* Psychology Cross Analysis */}
              {psychoCrossAnalysis.length > 0 && (
                <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-1.5 border-b border-border pb-3">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span>Cross-Analysis SQN × Kondisi Emosi</span>
                    </h3>
                    <StatTooltip
                      title="Cross-Analysis Psikologi vs SQN"
                      definition="Menghubungkan kondisi emosi saat entry dengan skor SQN (kualitas sistem) untuk melihat kondisi emosi mana yang paling merusak kualitas eksekusi."
                      interpretation="Kondisi emosi dengan SQN rendah menunjukkan bahwa state tersebut merusak konsistensi trading Anda. Pertimbangkan aturan 'no-trade' saat dalam kondisi tersebut."
                    />
                  </div>
                  <div className="space-y-2">
                    {psychoCrossAnalysis.map((item: any) => (
                      <div key={item.mood} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border text-xs">
                        <span className="font-semibold text-foreground w-32 shrink-0">{item.label}</span>
                        <span className="text-muted-foreground font-mono">{item.tradeCount} Trade</span>
                        <span className={cn('font-mono font-bold', item.winRate >= 50 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                          WR: {item.winRate}%
                        </span>
                        <span className={cn(
                          'font-mono font-extrabold ml-auto',
                          item.sqn >= 2.0 ? 'text-emerald-700 dark:text-emerald-400' :
                          item.sqn >= 1.0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'
                        )}>
                          SQN: {item.sqn.toFixed(2)}
                        </span>
                        <div className="w-24 h-2 rounded-full bg-muted overflow-hidden shrink-0">
                          <div
                            className={cn('h-full rounded-full', item.sqn >= 2.0 ? 'bg-emerald-500' : item.sqn >= 1.0 ? 'bg-amber-500' : 'bg-red-500')}
                            style={{ width: `${Math.min(Math.max(item.sqn / 4 * 100, 5), 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: ANALITIK PIPS (F-38) ─────────────────────────────────────── */}
          {activeTab === 'pips' && (
            <PipsAnalyticsTab />
          )}

          {/* ── TAB: PAIR / SIMBOL ───────────────────────────────────────────── */}
          {activeTab === 'pair' && (
            <PairRankingTable data={pairRanking} />
          )}

          {/* ── TAB: STRATEGI ────────────────────────────────────────────────── */}
          {activeTab === 'strategy' && (
            <StrategyRankingTable
              data={strategyRanking}
              dataCompleteness={strategyDataCompleteness}
              totalTrades={metrics?.totalTrades ?? 0}
            />
          )}
        </>
      )}
    </div>
  )
}
