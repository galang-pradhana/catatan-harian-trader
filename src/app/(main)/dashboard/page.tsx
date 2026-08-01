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
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Trading</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Evaluasi statistik performa &amp; kedisiplinan trading forex Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchAll()}
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <div className="flex items-center gap-2 bg-card border border-border px-3.5 py-2 rounded-xl shadow-sm">
            <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
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

      {/* 1. Summary Stat Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total PnL"
            value={summary ? `${(summary.totalPnl ?? 0) >= 0 ? '+' : ''}$${(summary.totalPnl ?? 0).toFixed(2)}` : '$0.00'}
            comparison={cmp.totalPnl !== undefined ? { value: cmp.totalPnl, label: 'vs bln lalu' } : undefined}
            icon={DollarSign}
            valueColor={(summary?.totalPnl ?? 0) >= 0 ? 'profit' : 'loss'}
          />
          <StatCard
            title="Total Trades"
            value={`${summary?.totalTrades ?? 0}`}
            comparison={cmp.totalTrades !== undefined ? { value: cmp.totalTrades, label: 'vs bln lalu' } : undefined}
            icon={Activity}
            subtitle="Closed trades"
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
            title="Avg R:R"
            value={`1:${(summary?.avgRR ?? 0).toFixed(2)}`}
            comparison={cmp.avgRR !== undefined ? { value: cmp.avgRR, label: 'vs bln lalu' } : undefined}
            icon={Percent}
          />
        </div>
      )}

      {/* 2. Performance Highlights */}
      {isLoading ? (
        <SkeletonCard className="h-24" />
      ) : highlightsData ? (
        <PerformanceHighlights highlights={highlightsData} />
      ) : (
        <div className="bg-card border border-border rounded-2xl p-4 text-center text-xs text-muted-foreground">
          Belum ada data untuk bulan {monthLabel}. Pastikan MT5 sudah tersinkron.
        </div>
      )}

      {/* 2b. Advanced Metrics (MFE & SQN) */}
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

      {/* 3. Calendar & Weekly Chart */}
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

      {/* 4. Symbol Performance Table */}
      {isLoading ? (
        <SkeletonCard className="h-48" />
      ) : (
        <SymbolPerformanceTable data={symbolData} />
      )}

      {/* Empty state when no data */}
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
