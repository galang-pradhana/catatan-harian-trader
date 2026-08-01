'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Plus, History, RefreshCw, Loader2 } from 'lucide-react'
import { TradeListItem } from '@/components/shared/trade-list-item'
import { TradeFilter, FilterState } from '@/components/shared/trade-filter'
import { Button } from '@/components/ui/button'
import type { Trade } from '@/types/trade'

const initialFilterState: FilterState = {
  search:        '',
  symbol:        'all',
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
  trade_journal: { self_grade?: string } | null
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
  params.set('limit', '20')
  if (filters.symbol !== 'all')        params.set('symbol', filters.symbol)
  if (filters.result !== 'all')        params.set('result', filters.result)
  if (filters.journalStatus !== 'all') params.set('journalStatus', filters.journalStatus)

  const res = await fetch(`/api/trades?${params.toString()}`)
  if (!res.ok) throw new Error('Gagal memuat data trade')
  const json = await res.json()
  return {
    trades: (json.trades as ApiTrade[]).map(mapApiTrade),
    total:  json.total ?? 0,
  }
}

export default function TradesPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<FilterState>(initialFilterState)
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trades', filters, page],
    queryFn:  () => fetchTrades(filters, page),
    staleTime: 30_000,
  })

  const trades = data?.trades ?? []
  const total  = data?.total ?? 0

  // Client-side search filter (search by symbol/ticket text)
  const filteredTrades = filters.search
    ? trades.filter((t) => {
        const q = filters.search.toLowerCase()
        return (
          t.symbol.toLowerCase().includes(q) ||
          t.mt5TicketId.toLowerCase().includes(q)
        )
      })
    : trades

  const incompleteCount = trades.filter((t) => t.journalStatus === 'incomplete').length

  const handleFilterChange = useCallback((next: FilterState) => {
    setFilters(next)
    setPage(1)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Riwayat Trade</h1>
            {incompleteCount > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                {incompleteCount} Belum Diisi
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Daftar closed &amp; open trade dari MT5.{' '}
            {total > 0 && <span className="text-primary font-medium">{total} total trade.</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/mt5')}>
            <Plus className="h-4 w-4 mr-1.5" /> Kelola MT5
          </Button>
        </div>
      </div>

      {/* Filter Component */}
      <TradeFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={() => { setFilters(initialFilterState); setPage(1) }}
      />

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl h-20 animate-pulse"
              style={{ opacity: 1 - i * 0.15 }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-3">
          <p className="text-sm text-destructive font-medium">Gagal memuat data trade</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba Lagi
          </Button>
        </div>
      )}

      {/* Trade List */}
      {!isLoading && !isError && filteredTrades.length > 0 && (
        <>
          <div className="space-y-3">
            {filteredTrades.map((trade) => (
              <TradeListItem key={trade.id} trade={trade} />
            ))}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Sebelumnya
              </Button>
              <span className="flex items-center text-xs text-muted-foreground px-3">
                Hal. {page} dari {Math.ceil(total / 20)}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => setPage((p) => p + 1)}
              >
                Berikutnya →
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredTrades.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center">
            <History className="h-7 w-7 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {filters.search || filters.symbol !== 'all' || filters.result !== 'all'
                ? 'Tidak Ada Trade Ditemukan'
                : 'Belum Ada Trade'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {filters.search || filters.symbol !== 'all' || filters.result !== 'all'
                ? 'Coba sesuaikan kata kunci atau filter pencarian Anda.'
                : 'Hubungkan akun MT5 dan pastikan EA sudah berjalan untuk mulai sync trade.'}
            </p>
          </div>
          {(filters.search || filters.symbol !== 'all') ? (
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
