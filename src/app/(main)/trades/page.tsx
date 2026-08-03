'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  History,
  RefreshCw,
  Loader2,
  ListFilter,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Award,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from 'lucide-react'
import { TradeListItem } from '@/components/shared/trade-list-item'
import { TradeFilter, FilterState } from '@/components/shared/trade-filter'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Trade } from '@/types/trade'

const initialFilterState: FilterState = {
  search:        '',
  symbol:        'all',
  status:        'all',
  result:        'all',
  journalStatus: 'all',
  strategyId:    'all',
}

interface ApiTrade {
  id: string
  mt5_ticket_id: string
  symbol: string
  direction: 'buy' | 'sell'
  volume: number
  open_price: number
  close_price: number | null
  open_time: string
  close_time: string | null
  sl: number | null
  tp: number | null
  pnl: number | null
  commission: number
  swap: number
  status: 'open' | 'closed'
  session: string | null
  journal_status: 'incomplete' | 'complete'
}

function mapApiTrade(t: ApiTrade): Trade {
  return {
    id:            t.id,
    mt5TicketId:   String(t.mt5_ticket_id),
    symbol:        t.symbol,
    direction:     t.direction,
    volume:        t.volume,
    openPrice:     t.open_price,
    closePrice:    t.close_price ?? undefined,
    openTime:      t.open_time,
    closeTime:     t.close_time ?? undefined,
    sl:            t.sl ?? undefined,
    tp:            t.tp ?? undefined,
    pnl:           t.pnl ?? undefined,
    commission:    t.commission,
    swap:          t.swap,
    status:        t.status,
    session:       (t.session as Trade['session']) ?? undefined,
    journalStatus: t.journal_status,
  }
}

async function fetchTrades(filters: FilterState, page: number): Promise<{ trades: Trade[]; total: number }> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('limit', '50')
  if (filters.symbol !== 'all')        params.set('symbol', filters.symbol)
  if (filters.status !== 'all')        params.set('status', filters.status)
  if (filters.result !== 'all')        params.set('result', filters.result)
  if (filters.journalStatus !== 'all') params.set('journalStatus', filters.journalStatus)
  if (filters.date)                    params.set('date', filters.date)

  const res = await fetch(`/api/trades?${params.toString()}`)
  if (!res.ok) throw new Error('Gagal memuat data trade')
  const json = await res.json()
  return {
    trades: (json.trades as ApiTrade[]).map(mapApiTrade),
    total:  json.total ?? 0,
  }
}

const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

function TradesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')
  const viewParam = searchParams.get('view') as 'list' | 'calendar' | null

  const [activeView, setActiveView] = useState<'list' | 'calendar'>(viewParam || 'list')
  const [filters, setFilters] = useState<FilterState>(() => ({
    ...initialFilterState,
    date: dateParam || undefined,
  }))
  const [page, setPage] = useState(1)

  // Calendar State
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  React.useEffect(() => {
    if (dateParam) {
      setFilters((prev) => ({ ...prev, date: dateParam }))
    }
  }, [dateParam])

  React.useEffect(() => {
    if (viewParam && (viewParam === 'list' || viewParam === 'calendar')) {
      setActiveView(viewParam)
    }
  }, [viewParam])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trades', filters, page],
    queryFn:  () => fetchTrades(filters, page),
    staleTime: 30_000,
  })

  const trades = data?.trades ?? []
  const total  = data?.total ?? 0

  // Client-side search filter
  const filteredTrades = useMemo(() => {
    if (!filters.search) return trades
    const q = filters.search.toLowerCase()
    return trades.filter((t) =>
      t.symbol.toLowerCase().includes(q) || t.mt5TicketId.toLowerCase().includes(q)
    )
  }, [trades, filters.search])

  const incompleteCount = useMemo(() => {
    return trades.filter((t) => t.journalStatus === 'incomplete').length
  }, [trades])

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(filters.search) ||
      filters.symbol !== 'all' ||
      filters.status !== 'all' ||
      filters.result !== 'all' ||
      filters.journalStatus !== 'all' ||
      filters.strategyId !== 'all' ||
      Boolean(filters.date)
    )
  }, [filters])

  // Contextual Mini Summary Bar (Aggregated metrics based on active filter)
  const summaryAggregates = useMemo(() => {
    const closed = filteredTrades.filter((t) => t.status === 'closed')
    const totalPnl = closed.reduce((acc, t) => acc + (t.pnl || 0), 0)
    const wins = closed.filter((t) => (t.pnl || 0) > 0).length
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0

    return {
      count: filteredTrades.length,
      closedCount: closed.length,
      totalPnl,
      winRate,
    }
  }, [filteredTrades])

  // Group trades by Date String (e.g. "3 Agustus 2026")
  const groupedTrades = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: Trade[] }> = []
    const map = new Map<string, Trade[]>()

    filteredTrades.forEach((t) => {
      const d = new Date(t.openTime)
      const dateLabel = isNaN(d.getTime())
        ? 'Tanggal Lainnya'
        : d.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })

      const list = map.get(dateLabel) || []
      map.set(dateLabel, [...list, t])
    })

    map.forEach((items, dateLabel) => {
      groups.push({ dateLabel, items })
    })

    return groups
  }, [filteredTrades])

  // Calendar grouping helper
  const tradesByDateMap = useMemo(() => {
    const map = new Map<string, Trade[]>()
    trades.forEach((t) => {
      if (!t.openTime) return
      const dStr = t.openTime.split('T')[0]
      const list = map.get(dStr) || []
      map.set(dStr, [...list, t])
    })
    return map
  }, [trades])

  const handleFilterChange = useCallback((next: FilterState) => {
    setFilters(next)
    setPage(1)
  }, [])

  const handleViewToggle = (view: 'list' | 'calendar') => {
    setActiveView(view)
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', view)
    router.replace(`/trades?${params.toString()}`)
  }

  // Calendar Click Date handler -> filter list by date & switch to list view
  const handleCalendarDayClick = (dateStr: string) => {
    setFilters((prev) => ({ ...prev, date: dateStr }))
    setPage(1)
    handleViewToggle('list')
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Jurnal Trading
            </h1>

            {/* Requirement 4: Clickable "X Belum Diisi" CTA Badge */}
            {incompleteCount > 0 && (
              <button
                type="button"
                onClick={() => handleFilterChange({ ...filters, journalStatus: 'incomplete' })}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer shadow-sm"
                title="Klik untuk filter trade yang belum diisi"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{incompleteCount} Belum Diisi</span>
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Daftar riwayat posisi trade MT5 &amp; pengisian catatan jurnal harian.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Requirement 2: Linear/Notion Style View Switcher Toggle */}
          <div className="bg-card border border-border p-1 rounded-xl flex items-center shadow-sm">
            <button
              type="button"
              onClick={() => handleViewToggle('list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeView === 'list'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>List View</span>
            </button>

            <button
              type="button"
              onClick={() => handleViewToggle('calendar')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                activeView === 'calendar'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendar View</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/mt5')}>
              <Plus className="h-4 w-4 mr-1" /> MT5
            </Button>
          </div>
        </div>
      </div>

      {/* Requirement 3: Refined Filter Component */}
      <TradeFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => { setFilters(initialFilterState); setPage(1) }}
      />

      {/* Requirement 5: Mini Summary Bar (Contextual Filter Aggregates) */}
      {!isLoading && filteredTrades.length > 0 && (
        <div className="bg-card/70 border border-border/80 rounded-2xl p-3.5 px-5 shadow-sm backdrop-blur-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Trade Terfilter</span>
              <span className="font-bold text-foreground font-mono">{summaryAggregates.count} Trade</span>
            </div>

            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Total Net PnL</span>
              <span className={`font-mono font-extrabold ${summaryAggregates.totalPnl >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                {summaryAggregates.totalPnl >= 0 ? '+' : ''}${summaryAggregates.totalPnl.toFixed(2)}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground text-[10px] uppercase font-semibold block">Win Rate</span>
              <span className="font-bold text-amber-400 font-mono">{summaryAggregates.winRate.toFixed(1)}%</span>
            </div>
          </div>

          {filters.date && (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Filter Tanggal: {filters.date}
            </span>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-destructive font-medium">Gagal memuat data trade</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba Lagi
          </Button>
        </div>
      )}

      {/* VIEW 1: LIST VIEW (Requirement 6 - Grouping by Date Header & Infinite Scroll/Pagination) */}
      {activeView === 'list' && !isLoading && !isError && filteredTrades.length > 0 && (
        <div className="space-y-6">
          {groupedTrades.map((group) => (
            <div key={group.dateLabel} className="space-y-2.5">
              {/* Date Group Header */}
              <div className="flex items-center gap-3 pt-2">
                <span className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-wider">
                  📅 {group.dateLabel}
                </span>
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {group.items.length} Trade
                </span>
              </div>

              {/* Trade Items */}
              <div className="space-y-2.5">
                {group.items.map((trade) => (
                  <TradeListItem key={trade.id} trade={trade} />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > 50 && (
            <div className="flex justify-center items-center gap-3 pt-4 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Sebelumnya
              </Button>
              <span className="text-xs text-muted-foreground font-mono font-semibold">
                Halaman {page} dari {Math.ceil(total / 50)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / 50)}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: CALENDAR VIEW (Requirement 7 - Integrated Calendar View with Click Date Filter) */}
      {activeView === 'calendar' && !isLoading && (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1) }
                  else { setCurrentMonth((m) => m - 1) }
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-base font-bold text-foreground px-2">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1) }
                  else { setCurrentMonth((m) => m + 1) }
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <span className="text-xs text-muted-foreground">
              💡 Klik pada tanggal untuk memfilter List View
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase py-1">
            {dayLabels.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-2">
            {(() => {
              const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()
              const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
              const padding = firstDayIndex === 0 ? 6 : firstDayIndex - 1

              return (
                <>
                  {Array.from({ length: padding }).map((_, i) => (
                    <div key={`pad-${i}`} className="min-h-[80px] rounded-2xl bg-muted/10 border border-border/20 opacity-30" />
                  ))}

                  {Array.from({ length: totalDays }).map((_, i) => {
                    const dayNum = i + 1
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                    const dayTrades = tradesByDateMap.get(dateStr) || []
                    const totalPnl = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0)
                    const hasTrades = dayTrades.length > 0
                    const isProfit = totalPnl >= 0

                    return (
                      <div
                        key={dayNum}
                        onClick={() => handleCalendarDayClick(dateStr)}
                        className={cn(
                          'min-h-[85px] rounded-2xl p-2.5 border flex flex-col justify-between transition-all cursor-pointer hover:scale-[1.02] select-none',
                          hasTrades
                            ? isProfit
                              ? 'bg-emerald-500/15 border-emerald-500/40 hover:border-emerald-400'
                              : 'bg-destructive/15 border-destructive/40 hover:border-destructive'
                            : 'bg-card border-border/60 hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{dayNum}</span>
                          {hasTrades && (
                            <span className={cn('text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded', isProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive')}>
                              {isProfit ? '+' : ''}${Math.abs(totalPnl).toFixed(0)}
                            </span>
                          )}
                        </div>

                        {hasTrades && (
                          <div className="space-y-1 mt-1">
                            <span className="text-[10px] text-muted-foreground block font-semibold">
                              {dayTrades.length} Trade
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredTrades.length === 0 && (
        <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
            <History className="h-7 w-7 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {hasActiveFilters ? 'Tidak Ada Trade Ditemukan' : 'Belum Ada Trade'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters
                ? 'Coba sesuaikan kata kunci atau filter pencarian Anda.'
                : 'Hubungkan akun MT5 dan pastikan EA sudah berjalan untuk mulai sync trade.'}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={() => { setFilters(initialFilterState); setPage(1) }}>
              Reset Filter
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => router.push('/mt5')}>
              <Plus className="h-4 w-4 mr-1.5" /> Hubungkan MT5
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function TradesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      }
    >
      <TradesPageContent />
    </React.Suspense>
  )
}
