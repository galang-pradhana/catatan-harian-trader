'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
  ChevronDown,
  AlertCircle,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Layers
} from 'lucide-react'
import { TradeListItem } from '@/components/shared/trade-list-item'
import { TradeFilter, FilterState } from '@/components/shared/trade-filter'
import { CompoundingTrackerPanel } from '@/components/shared/compounding-tracker-panel'
import { TradeJournalDrawer } from '@/components/shared/trade-journal-drawer'
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
  source?: 'mt5_sync' | 'csv_import' | 'manual'
  trade_journal?: { mood?: string; discipline?: 'yes' | 'no' } | null
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
    mood:          (t.trade_journal?.mood as Trade['mood']) ?? undefined,
    discipline:    (t.trade_journal?.discipline as Trade['discipline']) ?? undefined,
    source:        t.source ?? 'mt5_sync',
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
  if (filters.month)                   params.set('month', filters.month)
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

const LOCAL_STORAGE_COLLAPSE_KEY = 'trading_journal_left_panel_collapsed'

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

  // Drawer & Manual Trade States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null)

  // Split-Pane Collapsible State with LocalStorage Persistence
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false)

  // Accordion State per Date (e.g. { "Selasa, 4 Agustus 2026": true })
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})

  // Per-date pagination state for accordion (>15 items)
  const [visibleItemCounts, setVisibleItemCounts] = useState<Record<string, number>>({})

  // Calendar State
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  const handleOpenManualDrawer = () => {
    setSelectedTradeId(null)
    setIsDrawerOpen(true)
  }

  const handleSelectTrade = (id: string) => {
    setSelectedTradeId(id)
    setIsDrawerOpen(true)
  }


  // Load localStorage collapse preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_COLLAPSE_KEY)
      if (saved !== null) {
        setIsLeftPanelCollapsed(saved === 'true')
      } else {
        // Default collapse on mobile (<1024px)
        setIsLeftPanelCollapsed(window.innerWidth < 1024)
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  const toggleLeftPanel = () => {
    setIsLeftPanelCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(LOCAL_STORAGE_COLLAPSE_KEY, String(next))
      } catch {
        // Ignore localStorage errors
      }
      return next
    })
  }

  useEffect(() => {
    if (dateParam) {
      setFilters((prev) => ({ ...prev, date: dateParam }))
    }
  }, [dateParam])

  useEffect(() => {
    if (viewParam && (viewParam === 'list' || viewParam === 'calendar')) {
      setActiveView(viewParam)
    }
  }, [viewParam])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trades', filters, page],
    queryFn:  () => fetchTrades(filters, page),
    staleTime: 30_000,
  })

  // Fetch balance for compounding tracker
  const { data: mt5ConnData } = useQuery({
    queryKey: ['mt5-connections-summary'],
    queryFn: async () => {
      const res = await fetch('/api/mt5/connections')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 60_000,
  })

  const currentBalance = useMemo(() => {
    if (mt5ConnData?.connections && mt5ConnData.connections.length > 0) {
      const activeConn = mt5ConnData.connections.find((c: any) => c.status === 'connected') || mt5ConnData.connections[0]
      if (activeConn?.balance) return Number(activeConn.balance)
    }
    return 1000
  }, [mt5ConnData])

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

  // Group trades by Date String (Accordion Grouping)
  const groupedTrades = useMemo(() => {
    const groups: Array<{
      dateLabel: string
      items: Trade[]
      closedItems: Trade[]
      totalPnl: number
      wins: number
      losses: number
      netStatus: 'profit' | 'loss' | 'even'
    }> = []

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
      const closedItems = items.filter((t) => t.status === 'closed')
      const totalPnl = closedItems.reduce((acc, t) => acc + (t.pnl || 0), 0)
      const wins = closedItems.filter((t) => (t.pnl || 0) > 0).length
      const losses = closedItems.filter((t) => (t.pnl || 0) < 0).length
      const netStatus = totalPnl > 0 ? 'profit' : totalPnl < 0 ? 'loss' : 'even'

      groups.push({
        dateLabel,
        items,
        closedItems,
        totalPnl,
        wins,
        losses,
        netStatus,
      })
    })

    return groups
  }, [filteredTrades])

  // Set default accordion expanded state for the most recent date group
  useEffect(() => {
    if (groupedTrades.length > 0) {
      setExpandedDates((prev) => {
        // If state already has entries, preserve them; otherwise expand the first date (latest)
        if (Object.keys(prev).length === 0) {
          return { [groupedTrades[0].dateLabel]: true }
        }
        return prev
      })
    }
  }, [groupedTrades])

  const toggleAccordionDate = (dateLabel: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateLabel]: !prev[dateLabel],
    }))
  }

  const handleShowMoreItems = (dateLabel: string) => {
    setVisibleItemCounts((prev) => ({
      ...prev,
      [dateLabel]: (prev[dateLabel] || 15) + 15,
    }))
  }

  // Calendar month data fetcher
  const { data: calendarMonthData } = useQuery({
    queryKey: ['trades-calendar-month', currentYear, currentMonth],
    queryFn: async () => {
      const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
      const res = await fetch(`/api/dashboard/calendar?month=${monthStr}`)
      if (!res.ok) return []
      const json = await res.json()
      return json.days ?? []
    },
    staleTime: 60_000,
  })

  const calendarDaysMap = useMemo(() => {
    const map = new Map<string, { pnl: number | null; tradesCount: number }>()
    if (calendarMonthData && Array.isArray(calendarMonthData)) {
      calendarMonthData.forEach((d: any) => {
        map.set(d.date, { pnl: d.pnl, tradesCount: d.tradesCount })
      })
    }
    return map
  }, [calendarMonthData])

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
    <div className="space-y-6 max-w-[1600px] mx-auto px-2 sm:px-4">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              Jurnal Trading
            </h1>

            {/* Incomplete Journal Badge */}
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
          {/* List View / Calendar View Switcher */}
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

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              onClick={handleOpenManualDrawer}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1" /> + Tambah Jurnal Trade
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => router.push('/mt5')}>
              <Plus className="h-4 w-4 mr-1" /> MT5
            </Button>
          </div>
        </div>
      </div>


      {/* Filter Component */}
      <TradeFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => { setFilters(initialFilterState); setPage(1) }}
      />

      {/* Contextual Mini Summary Bar */}
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

      {/* VIEW 1: LIST VIEW (Requirement 1 & 2 & 3: SPLIT-PANE LAYOUT) */}
      {activeView === 'list' && !isLoading && !isError && filteredTrades.length > 0 && (
        <div className="relative">
          {/* Top Bar Split-Pane Toggle Button */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={toggleLeftPanel}
              className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground bg-card border border-border px-3 py-1.5 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              {isLeftPanelCollapsed ? (
                <>
                  <PanelLeftOpen className="h-4 w-4 text-amber-400" />
                  <span>Buka Compounding Tracker</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="h-4 w-4 text-amber-400" />
                  <span>Sembunyikan Panel Tracker</span>
                </>
              )}
            </button>

            <span className="text-[11px] text-muted-foreground font-mono">
              Mode Split-Pane: {isLeftPanelCollapsed ? '1 Kolom (Penuh)' : '2 Kolom (Compounding + List)'}
            </span>
          </div>

          {/* SPLIT-PANE CONTAINER */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* PANEL KIRI: COMPOUNDING TRACKER */}
            {!isLeftPanelCollapsed && (
              <div className="w-full lg:w-[330px] xl:w-[370px] shrink-0 sticky top-20 z-10 transition-all duration-300">
                <CompoundingTrackerPanel currentBalance={currentBalance} />
              </div>
            )}

            {/* PANEL KANAN: DAILY ACCORDION TRADE LIST */}
            <div className="flex-1 min-w-0 w-full space-y-4">
              {groupedTrades.map((group) => {
                const isExpanded = expandedDates[group.dateLabel] ?? false
                const visibleCount = visibleItemCounts[group.dateLabel] || 15
                const itemsToRender = group.items.slice(0, visibleCount)
                const hasMore = group.items.length > visibleCount

                return (
                  <div
                    key={group.dateLabel}
                    className="bg-card/90 border border-border/80 rounded-2xl overflow-hidden shadow-sm transition-all"
                  >
                    {/* ACCORDION HEADER WITH DAILY SUMMARY */}
                    <div
                      onClick={() => toggleAccordionDate(group.dateLabel)}
                      className={cn(
                        'p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b border-transparent',
                        isExpanded ? 'bg-muted/30 border-border/60' : 'hover:bg-muted/20'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-amber-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-extrabold text-foreground tracking-tight">
                              📅 {group.dateLabel}
                            </span>
                            <span className="text-xs font-mono font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/40">
                              {group.items.length} Trade
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5 text-xs">
                            <span className="text-muted-foreground font-semibold">Tally:</span>
                            <span className="font-mono text-emerald-400 font-bold">{group.wins}W</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-mono text-destructive font-bold">{group.losses}L</span>
                          </div>
                        </div>
                      </div>

                      {/* Daily Net PnL Summary */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total PnL Harian</span>
                          <span className={`font-mono text-sm font-extrabold ${group.totalPnl >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                            {group.totalPnl >= 0 ? '+' : ''}${group.totalPnl.toFixed(2)}
                          </span>
                        </div>

                        <span
                          className={cn(
                            'text-[10px] font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider',
                            group.netStatus === 'profit'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : group.netStatus === 'loss'
                              ? 'bg-destructive/15 text-destructive border-destructive/30'
                              : 'bg-muted text-muted-foreground border-border'
                          )}
                        >
                          Net: {group.netStatus}
                        </span>
                      </div>
                    </div>

                    {/* ACCORDION BODY: TRADE ITEMS */}
                    {isExpanded && (
                      <div className="p-3.5 space-y-2.5 bg-background/40">
                        {itemsToRender.map((trade) => (
                          <TradeListItem
                            key={trade.id}
                            trade={trade}
                            onSelect={() => handleSelectTrade(trade.id)}
                          />
                        ))}

                        {/* Pagination / "Muat Lebih Banyak" per day (>15 trades) */}
                        {hasMore && (
                          <div className="text-center pt-2 pb-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShowMoreItems(group.dateLabel)
                              }}
                              className="text-xs font-bold text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                            >
                              Muat 15 Trade Lagi ({group.items.length - visibleCount} tersisa)
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Main List Pagination */}
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
          </div>
        </div>
      )}

      {/* VIEW 2: CALENDAR VIEW (UNTOUCHED) */}
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
                    const dayData = calendarDaysMap.get(dateStr)
                    const hasTrades = (dayData?.tradesCount ?? 0) > 0
                    const totalPnl = dayData?.pnl ?? 0
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
                              {dayData?.tradesCount} Trade
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
                : 'Hubungkan akun MT5 atau tambahkan jurnal trade manual.'}
            </p>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={() => { setFilters(initialFilterState); setPage(1) }}>
              Reset Filter
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleOpenManualDrawer} className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold">
                <Plus className="h-4 w-4 mr-1" /> + Tambah Jurnal Trade
              </Button>
              <Button variant="secondary" size="sm" onClick={() => router.push('/mt5')}>
                Hubungkan MT5
              </Button>
            </div>
          )}
        </div>
      )}

      {/* SLIDE-OVER TRADE JOURNAL DRAWER */}
      <TradeJournalDrawer
        isOpen={isDrawerOpen}
        tradeId={selectedTradeId}
        tradesList={filteredTrades}
        onClose={() => setIsDrawerOpen(false)}
        onSaved={() => refetch()}
        onSelectTrade={(id) => setSelectedTradeId(id)}
      />
    </div>
  )
}

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
