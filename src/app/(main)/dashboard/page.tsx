'use client'

import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  DollarSign,
  Activity,
  Award,
  BarChart3,
  Percent,
  Calendar as CalendarIcon,
  RefreshCw,
  Wallet,
  Link2,
  Brain,
  ChevronRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Trophy
} from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { PerformanceHighlights } from '@/components/shared/performance-highlights'
import { WeeklyChart } from '@/components/shared/weekly-chart'

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

// ── Skeleton Loader ───────────────────────────────────────────
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

  const isLoading = loadS || loadC || loadW || loadSym || loadH

  // ── LEVEL 2: Mini 7-Day Heatmap Filter ─────────────────────
  const recent7DaysCalendar = useMemo(() => {
    if (!calendar?.days) return []
    // Take the last 7 days of recorded data
    return calendar.days.slice(-7)
  }, [calendar])

  // ── LEVEL 2: Top 3 Symbols Breakdown Filter ─────────────────
  const top3Symbols = useMemo(() => {
    if (!bySymbol?.symbols) return []
    // Sort by absolute PnL or total PnL descending, take top 3
    const sorted = [...bySymbol.symbols].sort((a, b) => Math.abs(b.totalPnl || 0) - Math.abs(a.totalPnl || 0))
    return sorted.slice(0, 3)
  }, [bySymbol])

  const weeklyData = useMemo(() => {
    if (!weekly?.weekly) return []
    return weekly.weekly.map((w: { weekNumber: number; startDate: string; endDate: string; pnl: number; tradesCount: number }) => ({
      week:        `M${w.weekNumber}`,
      pnl:         w.pnl,
      tradesCount: w.tradesCount,
    }))
  }, [weekly])

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

  const cmp = summary?.comparison ?? {}

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
            Dashboard Trading
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ringkasan performa &amp; metrik aksi cepat trading Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchAll()}
            className="p-2 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center gap-2 bg-card border border-border px-3 py-2 rounded-xl shadow-sm">
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
      {/* 🚀 LEVEL 1 - WAJIB TAMPIL UTUH DI DASHBOARD (PRIORITAS UTAMA) */}
      {/* ========================================================================= */}
      
      {/* 1. HERO METRIC: TOTAL PnL & SALDO REALTIME MT5 */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <SkeletonCard className="lg:col-span-7 h-44" />
          <SkeletonCard className="lg:col-span-5 h-44" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* HERO CARD: Total Net PnL (Bulan Berjalan) */}
          <div className="lg:col-span-7 bg-gradient-to-br from-card via-card to-amber-500/10 border border-amber-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between relative z-10">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" /> Hero Metric — Total Net PnL ({monthLabel})
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
                Hasil Perdagangan Bersih Terkumpul
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

          {/* CARD: Saldo Realtime Akun MT5 */}
          <div className="lg:col-span-5 bg-card/70 border border-border/80 rounded-3xl p-6 shadow-lg backdrop-blur-sm flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Saldo Realtime MT5
                  </h3>
                  <span className="text-[10px] text-muted-foreground">Tersinkronisasi Otomatis</span>
                </div>
              </div>
              <Link href="/mt5" className="text-xs font-semibold text-amber-500 hover:underline flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" /> MT5
              </Link>
            </div>

            {mt5Connections.length > 0 ? (
              <div className="space-y-2.5">
                {mt5Connections.map((conn: any) => (
                  <div key={conn.id} className="p-3 rounded-2xl border border-border bg-muted/20 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block truncate">{conn.brokerName} (#{conn.accountNumber})</span>
                      <span className="text-base font-extrabold font-mono text-emerald-400">
                        {conn.currentBalance != null ? `$${Number(conn.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'Belum Sync'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {conn.status === 'connected' ? 'Connected' : 'Offline'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground bg-muted/10 border border-dashed border-border/60 rounded-xl">
                Belum ada akun MT5 terhubung. <Link href="/mt5" className="text-amber-500 font-bold underline">Hubungkan MT5</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. POSISI BERJALAN / OPEN TRADES (Actionable & Butuh Perhatian) */}
      <div className="bg-card/70 border border-primary/30 rounded-3xl p-5 shadow-lg space-y-3 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Posisi Berjalan (Open Trades)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/30">
              {openTrades.length} Running
            </span>
          </div>

          <Link href="/trades?status=open" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span>Lihat Semua Posisi</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
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

      {/* 3. METRIK KESEHATAN INTI (Win Rate & Profit Factor Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          title="Total Trades"
          value={`${summary?.totalTrades ?? 0}`}
          comparison={cmp.totalTrades !== undefined ? { value: cmp.totalTrades, label: 'vs bln lalu' } : undefined}
          icon={Activity}
          subtitle="Closed deals"
        />
        <StatCard
          title="Avg Risk:Reward"
          value={`1:${(summary?.avgRR ?? 0).toFixed(2)}`}
          comparison={cmp.avgRR !== undefined ? { value: cmp.avgRR, label: 'vs bln lalu' } : undefined}
          icon={Percent}
        />
      </div>

      {/* ========================================================================= */}
      {/* 📊 LEVEL 2 - VERSI RINGKAS + TOMBOL "LIHAT DETAIL" */}
      {/* ========================================================================= */}
      
      {/* 4. SOROTAN PERFORMA (Compact Strip Horizontal) */}
      {highlightsData ? (
        <PerformanceHighlights highlights={highlightsData} />
      ) : null}

      {/* 5. MINI HEATMAP KALENDER (7 HARI TERAKHIR) + SPARKLINE MINGGUAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Mini 7-Day Heatmap Kalender */}
        <div className="lg:col-span-7 bg-card/70 border border-border/80 rounded-3xl p-5 shadow-lg backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5 text-emerald-400" />
              <span>Mini Heatmap PnL (7 Hari Terakhir)</span>
            </h3>

            <Link href="/calendar" className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1">
              <span>Lihat Kalender Lengkap</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {recent7DaysCalendar.length > 0 ? (
              recent7DaysCalendar.map((day: any) => {
                const isWin = (day.pnl ?? 0) > 0
                const isLoss = (day.pnl ?? 0) < 0
                return (
                  <div
                    key={day.date}
                    className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
                      isWin
                        ? 'bg-emerald-500/15 border-emerald-500/30'
                        : isLoss
                        ? 'bg-destructive/15 border-destructive/30'
                        : 'bg-muted/20 border-border/40'
                    }`}
                  >
                    <span className="text-[9px] text-muted-foreground font-mono block">
                      {day.date.split('-').slice(1).join('/')}
                    </span>
                    <span className={`font-mono text-xs font-bold block ${isWin ? 'text-emerald-400' : isLoss ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {day.pnl != null ? `${isWin ? '+' : ''}$${day.pnl.toFixed(0)}` : '-'}
                    </span>
                  </div>
                )
              })
            ) : (
              <div className="col-span-7 text-center py-3 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 rounded bg-muted/30 border border-border text-[10px]">Data belum cukup</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Sparkline Performa Mingguan */}
        <div className="lg:col-span-5 bg-card/70 border border-border/80 rounded-3xl p-5 shadow-lg backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
              <span>Sparkline Performa Mingguan</span>
            </h3>
          </div>

          {weeklyData.length > 0 ? (
            <WeeklyChart data={weeklyData} />
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              <span className="px-2.5 py-1 rounded-full bg-muted/30 border border-border text-[10px]">Data belum cukup</span>
            </div>
          )}
        </div>
      </div>

      {/* 6. BREAKDOWN PER SIMBOL (TOP 3 SIMBOL TERTINGGI/TERBURUK) */}
      <div className="bg-card/70 border border-border/80 rounded-3xl p-5 shadow-lg backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-blue-400" />
            <span>Top 3 Simbol &amp; Pair Teratas ({monthLabel})</span>
          </h3>

          <Link href="/analysis" className="text-xs font-semibold text-amber-500 hover:underline flex items-center gap-1">
            <span>Lihat Semua Simbol</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {top3Symbols.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3Symbols.map((item: any) => {
              const isProfit = (item.totalPnl || 0) >= 0
              return (
                <div key={item.symbol} className="p-4 rounded-2xl border border-border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-foreground font-mono">{item.symbol}</span>
                    <span className={`text-xs font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-destructive'}`}>
                      {isProfit ? '+' : ''}${(item.totalPnl || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>Win Rate: {item.winRate?.toFixed(0)}%</span>
                    <span>{item.tradesCount} Trade</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted/30 border border-border text-[10px]">Data belum cukup</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 🧠 LEVEL 3 - CTA CARD RUJUKAN KE HALAMAN ANALISIS PSIKOLOGI & SYSTEM QUALITY */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-card via-card to-purple-500/10 border border-purple-500/30 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-bold text-foreground">
              Analisis Psikologi Trading, MFE (Exit Efficiency), &amp; System Quality (SQN)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Metrik Efisiensi Exit (MFE) dan Skor Kualitas Sistem (SQN) kini dipindahkan ke halaman terpisah agar analisis psikologi dan naratif trading Anda lebih mendalam &amp; fokus.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/psychology"
            className="px-4 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>Mood &amp; Refleksi</span>
          </Link>

          <Link
            href="/analysis"
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-colors flex items-center gap-1.5"
          >
            <span>SQN &amp; MFE Analytics</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
