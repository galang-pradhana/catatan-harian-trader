'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import {
  TrendingUp,
  Filter,
  AlertTriangle,
  Sliders,
  Loader2,
  RefreshCw,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PipConfigModal } from '@/components/shared/pip-config-modal'
import { cn } from '@/lib/utils'

export function PipsAnalyticsTab() {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7))
  const [selectedMarketCondition, setSelectedMarketCondition] = useState<string>('all')
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([])
  const [isPipModalOpen, setIsPipModalOpen] = useState<boolean>(false)

  // Fetch strategies for filter options
  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies-pips-filter'],
    queryFn: async () => {
      const res = await fetch('/api/strategies')
      if (!res.ok) return []
      const json = await res.json()
      return json.strategies || []
    },
    staleTime: 60_000,
  })

  // Fetch Pips Analytics
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['pips-analytics', selectedMonth, selectedMarketCondition, selectedStrategyIds.join(',')],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('month', selectedMonth)
      if (selectedMarketCondition !== 'all') {
        params.set('market_condition', selectedMarketCondition)
      }
      if (selectedStrategyIds.length > 0) {
        params.set('strategy_ids', selectedStrategyIds.join(','))
      }
      const res = await fetch(`/api/analytics/pips?${params.toString()}`)
      if (!res.ok) throw new Error('Gagal memuat data analitik pips')
      return res.json()
    },
    staleTime: 30_000,
  })

  const monthlyTotalPips = data?.monthlyTotalPips ?? 0
  const validTradesCount = data?.validTradesCount ?? 0
  const excludedCount = data?.excludedCount ?? 0
  const dailyPips = data?.dailyPips || []

  const toggleStrategyFilter = (id: string) => {
    setSelectedStrategyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Filters Header */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span>Akumulasi Pips &amp; Filter Kinerja (Addendum V7)</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Analisis total pips harian &amp; bulanan berdasarkan kombinasi strategi dan kondisi market.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Month Picker */}
            <div className="flex items-center gap-2 bg-muted/30 border border-border px-3 py-1.5 rounded-xl">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-foreground focus:outline-none cursor-pointer"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPipModalOpen(true)}
              className="text-xs font-bold gap-1.5"
            >
              <Sliders className="h-3.5 w-3.5 text-primary" />
              <span>Pengaturan Pip Size</span>
            </Button>

            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filter Controls: Market Condition & Strategies */}
        <div className="space-y-3">
          {/* Filter 1: Market Condition */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-bold text-muted-foreground shrink-0">Kondisi Market:</span>
            {[
              { id: 'all', label: 'Semua Kondisi' },
              { id: 'trending', label: '📈 Trending' },
              { id: 'ranging', label: '↔️ Ranging' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedMarketCondition(opt.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer text-xs',
                  selectedMarketCondition === opt.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Filter 2: Strategy Tag Multi-Select */}
          {strategies.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-border/40">
              <span className="font-bold text-muted-foreground shrink-0">Filter Strategi:</span>
              {strategies.map((s: any) => {
                const isSelected = selectedStrategyIds.includes(s.id)
                const itemColor = s.color || '#D4A94C'
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStrategyFilter(s.id)}
                    style={
                      isSelected
                        ? { backgroundColor: itemColor, borderColor: itemColor, color: '#000000' }
                        : { backgroundColor: `${itemColor}15`, borderColor: `${itemColor}60`, color: itemColor }
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs"
                  >
                    {s.name} {isSelected && '✓'}
                  </button>
                )
              })}
              {selectedStrategyIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedStrategyIds([])}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
                >
                  Reset Filter Strategi
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Exclusion Notice Banner (NF-19 & TC-702) */}
      {excludedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-300">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <span className="font-bold block">
                {excludedCount} trade dikecualikan dari total pips
              </span>
              <span className="text-[11px] text-muted-foreground">
                Trade dengan simbol yang `pip_size`-nya belum dikonfirmasi tidak ikut dihitung untuk mencegah angka yang salah.
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setIsPipModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shrink-0 cursor-pointer shadow-sm"
          >
            Konfirmasi Pip Size Simbol
          </Button>
        </div>
      )}

      {/* Main Metric Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Total Pips Bulan Ini</span>
          <span className={cn('text-3xl font-black font-mono block', monthlyTotalPips >= 0 ? 'text-emerald-500' : 'text-red-500')}>
            {monthlyTotalPips >= 0 ? '+' : ''}{monthlyTotalPips.toLocaleString()} Pips
          </span>
          <span className="text-[11px] text-muted-foreground block font-medium">
            Hasil akumulasi periode {selectedMonth}
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Trade Terhitung (Pips Valid)</span>
          <span className="text-3xl font-black font-mono text-foreground block">
            {validTradesCount} Trade
          </span>
          <span className="text-[11px] text-muted-foreground block font-medium">
            {excludedCount > 0 ? `${excludedCount} trade dikecualikan` : 'Semua trade terkonfirmasi'}
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold text-muted-foreground uppercase">Filter Aktif</span>
          <span className="text-sm font-extrabold text-foreground block truncate mt-1">
            Kondisi: {selectedMarketCondition === 'all' ? 'Semua' : selectedMarketCondition}
          </span>
          <span className="text-[11px] text-muted-foreground block truncate">
            {selectedStrategyIds.length > 0 ? `${selectedStrategyIds.length} Strategi dipilih` : 'Semua Strategi'}
          </span>
        </div>
      </div>

      {/* Recharts Daily Accumulated Pips Bar Chart */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-foreground">Grafik Akumulasi Pips Harian</h3>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-xs text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Menghitung akumulasi pips...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-destructive">Gagal memuat data grafik pips</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyPips} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val) => val.slice(8)} // show day DD
                  tick={{ fontSize: 10 }}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const row = payload[0].payload
                      return (
                        <div className="bg-card border border-border p-2.5 rounded-xl shadow-xl text-xs space-y-1 font-mono">
                          <p className="font-bold text-foreground">{row.date}</p>
                          <p className={cn('font-extrabold', row.pips >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            Pips: {row.pips >= 0 ? '+' : ''}{row.pips} pips
                          </p>
                          <p className="text-[10px] text-muted-foreground">{row.tradesCount} Trade tertutup</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ReferenceLine y={0} stroke="#888888" strokeDasharray="2 2" />
                <Bar
                  dataKey="pips"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Pip Configuration Modal */}
      <PipConfigModal
        isOpen={isPipModalOpen}
        onClose={() => setIsPipModalOpen(false)}
      />
    </div>
  )
}
