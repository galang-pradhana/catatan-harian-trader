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
} from 'lucide-react'
import { StatCard } from '@/components/shared/stat-card'
import { WeeklyChart } from '@/components/shared/weekly-chart'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

async function fetchSummary() {
  const res = await fetch('/api/dashboard/summary')
  if (!res.ok) return null
  return res.json()
}

export default function StatisticsPage() {
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchSummary,
    staleTime: 30_000,
  })

  const totalProfit  = summary?.totalProfit ?? 1245.50
  const winRate      = summary?.winRate ?? 68
  const profitFactor = summary?.profitFactor ?? 1.85
  const totalTrades  = summary?.totalTrades ?? 25

  return (
    <div className="space-y-6">
      {/* Header & Timeframe Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Statistik &amp; Performa Trading
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Analisis mendalam mengenai metrik performa, distribusi pair, dan rekor trading Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1 shadow-sm">
          {[
            { id: 'weekly', label: 'Mingguan' },
            { id: 'monthly', label: 'Bulanan' },
            { id: 'yearly', label: 'Tahunan' },
          ].map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id as 'weekly' | 'monthly' | 'yearly')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                timeframe === tf.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Profit" value={`+$${totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={TrendingUp} />
        <StatCard title="Win Rate" value={`${winRate}%`} icon={Award} />
        <StatCard title="Profit Factor" value={String(profitFactor)} icon={Zap} />
        <StatCard title="Total Trade" value={String(totalTrades)} icon={BarChart3} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Bar Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">Grafik Performa PnL</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Profit &amp; loss per periode {timeframe}</p>
            </div>
          </div>
          <div className="h-72">
            <WeeklyChart data={[]} />
          </div>
        </div>

        {/* Pair Distribution Donut Chart (1/3 width) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <PieIcon className="h-5 w-5 text-primary" /> Distribusi Pair
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Persentase trade per instrumen</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { pair: 'EURUSD', pct: 40, color: 'bg-primary' },
              { pair: 'XAUUSD', pct: 28, color: 'bg-profit' },
              { pair: 'GBPUSD', pct: 16, color: 'bg-amber-500' },
              { pair: 'USDJPY', pct: 10, color: 'bg-blue-500' },
              { pair: 'Lainnya', pct: 6,  color: 'bg-muted-foreground' },
            ].map((item) => (
              <div key={item.pair} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-foreground">{item.pair}</span>
                  <span className="text-muted-foreground font-mono">{item.pct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted/40 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', item.color)} style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Metrics Breakdown Grid */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-foreground border-b border-border pb-3">
          Breakdown Rekor &amp; Metrik Detail
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          {[
            { label: 'Rata-rata Win', value: '+$85.45', color: 'text-profit', sub: 'Per trade menang' },
            { label: 'Rata-rata Loss', value: '-$42.30', color: 'text-loss', sub: 'Per trade kalah' },
            { label: 'Hari Terbaik', value: '+$320.50', color: 'text-profit', sub: '24 Mei 2026' },
            { label: 'Hari Terburuk', value: '-$158.75', color: 'text-loss', sub: '21 Mei 2026' },
            { label: 'Max Win Streak', value: '5 Trade', color: 'text-primary font-extrabold', sub: 'Beruntun' },
            { label: 'Max Loss Streak', value: '2 Trade', color: 'text-foreground font-semibold', sub: 'Beruntun' },
          ].map((m) => (
            <div key={m.label} className="bg-muted/20 border border-border/60 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase block">{m.label}</span>
              <span className={cn('text-lg font-mono font-bold block', m.color)}>{m.value}</span>
              <span className="text-[10px] text-muted-foreground block">{m.sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
