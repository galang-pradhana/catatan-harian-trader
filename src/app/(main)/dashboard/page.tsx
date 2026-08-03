'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DollarSign,
  Activity,
  Award,
  BarChart3,
  Percent,
  Calendar as CalendarIcon,
  RefreshCw,
  Loader2,
  Wallet,
  Link2,
  ShieldCheck,
  Brain,
  Layers,
  ArrowUpRight,
} from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { PnLCalendar } from '@/components/shared/pnl-calendar'
import { WeeklyChart } from '@/components/shared/weekly-chart'
import { SymbolPerformanceTable } from '@/components/shared/symbol-performance-table'
import { PerformanceHighlights } from '@/components/shared/performance-highlights'
import { MfeCard } from '@/components/shared/mfe-card'
import { SqnCard } from '@/components/shared/sqn-card'

// ── Month helper ─────────────────────────────────────────────
function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function buildMonthOptions(): Array<{ value: string; label: string }> {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    options.push({ value, label: `Bulan ${label}` })
  }
  return options
}

// ── API fetchers ──────────────────────────────────────────────
async function fetchSummary(month: string) {
  const res = await fetch(`/api/dashboard/summary?month=${month}`)
  if (!res.ok) return null
  return res.json()
}

async function fetchCalendar(month: string) {
  const res = await fetch(`/api/dashboard/calendar?month=${month}`)
  if (!res.ok) return null
  return res.json()
}

async function fetchWeekly(month: string) {
  const res = await fetch(`/api/dashboard/weekly?month=${month}`)
  if (!res.ok) return null
  return res.json()
}

async function fetchBySymbol(month: string) {
  const res = await fetch(`/api/dashboard/by-symbol?month=${month}`)
  if (!res.ok) return null
  return res.json()
}

async function fetchHighlights(month: string) {
  const res = await fetch(`/api/dashboard/highlights?month=${month}`)
  if (!res.ok) return null
  return res.json()
}

async function fetchAdvancedMetrics(month: string) {
  const res = await fetch(`/api/dashboard/advanced-metrics?month=${month}`)
  if (!res.ok) return null
  return res.json()
}

async function fetchOpenTrades() {
  const res = await fetch('/api/trades?status=open&limit=10')
  if (!res.ok) return []
  const json = await res.json()
  return json.trades ?? []
}

async function fetchMt5Connections() {
  const res = await fetch('/api/mt5/connections')
  if (!res.ok) return []
  const json = await res.json()
  return json.connections ?? []
}

// ── Loading Skeleton ──────────────────────────────────────────
function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`bg-card border border-border rounded-2xl animate-pulse ${className}`} />
}

// ── Main Dashboard Page ───────────────────────────────────────
export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const monthOptions = useMemo(() => buildMonthOptions(), [])

  const queryOpts = { staleTime: 60_000 }

  const { data: summary, isLoading: loadS, refetch: refetchAll } = useQuery({
    queryKey: ['dashboard-summary', selectedMonth],
    queryFn:  () => fetchSummary(selectedMonth),
    ...queryOpts,
  })

  const { data: calendar, isLoading: loadC } = useQuery({
    queryKey: ['dashboard-calendar', selectedMonth],
    queryFn:  () => fetchCalendar(selectedMonth),
    ...queryOpts,
  })

  const { data: weekly, isLoading: loadW } = useQuery({
    queryKey: ['dashboard-weekly', selectedMonth],
    queryFn:  () => fetchWeekly(selectedMonth),
    ...queryOpts,
  })

  const { data: bySymbol, isLoading: loadSym } = useQuery({
    queryKey: ['dashboard-symbols', selectedMonth],
    queryFn:  () => fetchBySymbol(selectedMonth),
    ...queryOpts,
  })

  const { data: highlights, isLoading: loadH } = useQuery({
    queryKey: ['dashboard-highlights', selectedMonth],
    queryFn:  () => fetchHighlights(selectedMonth),
    ...queryOpts,
  })

  const { data: advanced, isLoading: loadAdv } = useQuery({
    queryKey: ['dashboard-advanced-metrics', selectedMonth],
    queryFn:  () => fetchAdvancedMetrics(selectedMonth),
    ...queryOpts,
  })

  const { data: openTrades = [] } = useQuery({
    queryKey: ['dashboard-open-trades'],
    queryFn:  fetchOpenTrades,
    refetchInterval: 15_000,
  })

  const { data: mt5Connections = [] } = useQuery({
    queryKey: ['dashboard-mt5-connections'],
    queryFn:  fetchMt5Connections,
    refetchInterval: 30_000,
  })

  const isLoading = loadS || loadC || loadW || loadSym || loadH || loadAdv

  // ── Map API data to component props ────────────────────────
  const calendarDays = useMemo(() => {
    if (!calendar?.days) return []
    return calendar.days.map((d: { date: string; pnl: number | null; tradesCount: number }) => ({
      date:        d.date,
      pnl:         d.pnl,
      tradesCount: d.tradesCount,
    }))
  }, [calendar])

  const weeklyData = useMemo(() => {
    if (!weekly?.weekly) return []
    return weekly.weekly.map((w: { weekNumber: number; startDate: string; endDate: string; pnl: number; tradesCount: number }) => ({
      week:        `Minggu ${w.weekNumber}`,
      pnl:         w.pnl,
      tradesCount: w.tradesCount,
    }))
  }, [weekly])

  const symbolData = useMemo(() => {
    if (!bySymbol?.symbols) return []
    return bySymbol.symbols
  }, [bySymbol])

  const highlightsData = useMemo(() => {
    if (!highlights?.highlights) return null
    const h = highlights.highlights
    return {
      bestDay:       h.bestDay       ? { date: h.bestDay.date,  pnl: h.bestDay.pnl }             : null,
      worstDay:      h.worstDay      ? { date: h.worstDay.date, pnl: h.worstDay.pnl }            : null,
      mostTradesDay: h.mostTradesDay ? { date: h.mostTradesDay.date, count: h.mostTradesDay.count } : null,
      maxWinStreak:  h.maxWinStreak,
      maxLossStreak: h.maxLossStreak,
    }
  }, [highlights])

  const monthLabel = useMemo(() => {
    const opt = monthOptions.find((o) => o.value === selectedMonth)
    return opt ? opt.label.replace('Bulan ', '') : selectedMonth
  }, [selectedMonth, monthOptions])

  // Comparison helper
  const cmp = summary?.comparison ?? {}

  return (
    <div className="space-y-8">
      {/* 👑 Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Dashboard Trading
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Evaluasi statistik performa, manajemen risiko &amp; kedisiplinan trading forex Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchAll()}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-2.5 rounded-xl shadow-sm">
            <CalendarIcon className="h-4 w-4 text-amber-500 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-card text-foreground text-xs font-bold focus:outline-none cursor-pointer border-none"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-card text-foreground">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: 📊 RINGKASAN PERFORMA (PERFORMANCE OVERVIEW) */}
      {/* ========================================================================= */}
      <section className="bg-card/40 border border-border/80 rounded-3xl p-5 md:p-6 space-y-6 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-wider">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            <span>Ringkasan Performa — {monthLabel}</span>
          </h2>
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Prioritas Informasi #1
          </span>
        </div>

        {/* Hero PnL Card & Secondary Metrics Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <SkeletonCard className="lg:col-span-7 h-44" />
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-20" />)}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 🏆 HERO METRIC CARD: TOTAL PnL (Col Span 7) */}
            <div className="lg:col-span-7 bg-gradient-to-br from-card via-card to-amber-500/10 border border-amber-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between relative z-10">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Hero Metric — Total Net PnL
                </span>
                {cmp.totalPnl !== undefined && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cmp.totalPnl >= 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-destructive/15 text-destructive border-destructive/30'}`}>
                    {cmp.totalPnl >= 0 ? '+' : ''}{cmp.totalPnl.toFixed(1)}% vs bln lalu
                  </span>
                )}
              </div>

              <div className="my-3 relative z-10">
                <span className={`text-4xl md:text-5xl font-extrabold font-mono tracking-tight ${(summary?.totalPnl ?? 0) >= 0 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.25)]' : 'text-destructive drop-shadow-[0_0_15px_rgba(239,68,68,0.25)]'}`}>
                  {summary ? `${(summary.totalPnl ?? 0) >= 0 ? '+' : ''}$${(summary.totalPnl ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '$0.00'}
                </span>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  Net Hasil Perdagangan Bersih Bulan {monthLabel}
                </p>
              </div>

              <div className="pt-3.5 border-t border-border/50 grid grid-cols-2 gap-4 relative z-10 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] block">Win Rate Bulan Ini</span>
                  <span className="font-bold text-foreground font-mono text-sm">{(summary?.winRate ?? 0).toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Profit Factor</span>
                  <span className="font-bold text-amber-400 font-mono text-sm">{(summary?.profitFactor ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 📊 SECONDARY METRICS GRID (Col Span 5 - Compact 2x2 Grid) */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              <StatCard
                title="Total Trades"
                value={`${summary?.totalTrades ?? 0}`}
                comparison={cmp.totalTrades !== undefined ? { value: cmp.totalTrades, label: 'vs bln lalu' } : undefined}
                icon={Activity}
                subtitle="Closed deals"
              />
              <StatCard
                title="Win Rate"
                value={`${(summary?.winRate ?? 0).toFixed(1)}%`}
                comparison={cmp.winRate !== undefined ? { value: cmp.winRate, label: 'vs bln lalu' } : undefined}
                icon={Award}
                valueColor={(summary?.winRate ?? 0) >= 50 ? 'profit' : 'loss'}
              />
              <StatCard
                title="Profit Factor"
                value={`${(summary?.profitFactor ?? 0).toFixed(2)}`}
                comparison={cmp.profitFactor !== undefined ? { value: cmp.profitFactor, label: 'vs bln lalu' } : undefined}
                icon={BarChart3}
                valueColor={(summary?.profitFactor ?? 0) >= 1 ? 'profit' : 'loss'}
              />
              <StatCard
                title="Avg Risk:Reward"
                value={`1:${(summary?.avgRR ?? 0).toFixed(2)}`}
                comparison={cmp.avgRR !== undefined ? { value: cmp.avgRR, label: 'vs bln lalu' } : undefined}
                icon={Percent}
              />
            </div>
          </div>
        )}

        {/* 🟢 Open Trades Banner */}
        <div className="bg-card border border-primary/30 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
              </span>
              <h3 className="text-xs font-bold text-foreground">
                Posisi Berjalan (Open Trades)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/30">
                {openTrades.length} Running
              </span>
            </div>

            <a
              href="/trades?status=open"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>Lihat Posisi Running</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {openTrades.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {openTrades.slice(0, 4).map((t: any) => {
                const isBuy = (t.direction || t.type || '').toLowerCase() === 'buy'
                return (
                  <div key={t.id} className="p-2.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded font-extrabold text-[10px] uppercase ${isBuy ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'}`}>
                        {t.direction || t.type}
                      </span>
                      <div>
                        <span className="font-bold text-foreground block">{t.symbol}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{t.lots || t.volume || '0.1'} Lot @ {t.open_price ?? t.openPrice ?? '-'}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Running
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="py-2.5 text-center text-xs text-muted-foreground bg-muted/10 border border-dashed border-border/60 rounded-xl">
              🟢 Tidak ada posisi trade yang sedang berjalan (Open) saat ini.
            </div>
          )}
        </div>

        {/* 💳 Realtime MT5 Account Balance Card */}
        {mt5Connections.length > 0 && (
          <div className="bg-card border border-amber-500/30 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Saldo Realtime Akun MT5 (Sync Terakhir)
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Tersinkronisasi otomatis dari EA Connector MT5
                  </p>
                </div>
              </div>

              <a
                href="/mt5"
                className="text-xs font-semibold text-amber-500 hover:underline flex items-center gap-1"
              >
                <Link2 className="h-3.5 w-3.5" />
                <span>Kelola Koneksi</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {mt5Connections.map((conn: any) => (
                <div
                  key={conn.id}
                  className="p-3 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {conn.brokerName} (#{conn.accountNumber})
                    </span>
                    <span className="text-sm font-extrabold font-mono text-emerald-500">
                      {conn.currentBalance != null
                        ? `$${Number(conn.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : 'Belum Sync'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 block w-fit ml-auto">
                      {conn.status === 'connected' ? 'Connected' : 'Offline'}
                    </span>
                    {conn.lastSyncedAt && (
                      <span className="text-[10px] text-muted-foreground mt-1 block">
                        {new Date(conn.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🏅 Compact Highlights Horizontal Strip */}
        {isLoading ? (
          <SkeletonCard className="h-20" />
        ) : highlightsData ? (
          <PerformanceHighlights highlights={highlightsData} />
        ) : null}
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: 🧠 DISIPLIN & PSIKOLOGI TRADING */}
      {/* ========================================================================= */}
      <section className="bg-card/40 border border-border/80 rounded-3xl p-5 md:p-6 space-y-4 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-wider">
            <Brain className="h-4 w-4 text-purple-400" />
            <span>Disiplin &amp; Psikologi Trading</span>
          </h2>
          <span className="text-[11px] text-muted-foreground">MFE &amp; SQN Metrics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isLoading ? (
            <>
              <SkeletonCard className="h-32" />
              <SkeletonCard className="h-32" />
            </>
          ) : (
            <>
              <MfeCard
                efficiencyPercent={advanced?.mfe?.efficiencyPercent ?? 74}
                excludedCount={advanced?.mfe?.excludedCsvCount ?? 0}
              />
              <SqnCard
                sqnScore={advanced?.sqn?.score ?? 2.65}
                sampleCount={advanced?.sqn?.sampleCount ?? summary?.totalTrades ?? 28}
              />
            </>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: 📅 RIWAYAT & KALENDER PnL */}
      {/* ========================================================================= */}
      <section className="bg-card/40 border border-border/80 rounded-3xl p-5 md:p-6 space-y-4 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-wider">
            <CalendarIcon className="h-4 w-4 text-emerald-400" />
            <span>Riwayat &amp; Kalender PnL</span>
          </h2>
          <span className="text-[11px] text-muted-foreground">Analisis Mingguan &amp; Harian</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            {isLoading ? (
              <SkeletonCard className="h-72" />
            ) : (
              <PnLCalendar days={calendarDays} monthName={monthLabel} />
            )}
          </div>
          <div className="lg:col-span-5">
            {isLoading ? (
              <SkeletonCard className="h-72" />
            ) : (
              <WeeklyChart data={weeklyData} />
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: 📈 BREAKDOWN INSTRUMEN & PASANGAN MATA UANG */}
      {/* ========================================================================= */}
      <section className="bg-card/40 border border-border/80 rounded-3xl p-5 md:p-6 space-y-4 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2 uppercase tracking-wider">
            <Layers className="h-4 w-4 text-blue-400" />
            <span>Breakdown Performa Per Instrumen</span>
          </h2>
        </div>

        {isLoading ? (
          <SkeletonCard className="h-48" />
        ) : (
          <SymbolPerformanceTable data={symbolData} />
        )}
      </section>

      {/* Empty State when no trades exist */}
      {!isLoading && (summary?.totalTrades ?? 0) === 0 && (
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-foreground">Tidak ada data trade untuk {monthLabel}</p>
          <p className="text-xs text-muted-foreground">
            Pastikan EA MT5 sudah dipasang dan berjalan, atau pilih bulan yang berbeda.
          </p>
        </div>
      )}
    </div>
  )
}
