'use client'

import React, { useState } from 'react'
import { Filter, Search, X, ChevronDown } from 'lucide-react'
import { DUMMY_STRATEGIES } from '@/constants/dummy-trades'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FilterState {
  search: string
  symbol: string
  result: 'all' | 'profit' | 'loss'
  journalStatus: 'all' | 'complete' | 'incomplete'
  strategyId: string
}

export interface TradeFilterProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  onReset: () => void
}

export function TradeFilter({ filters, onFilterChange, onReset }: TradeFilterProps) {
  const [isExpandedMobile, setIsExpandedMobile] = useState(false)

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const hasActiveFilters =
    filters.search ||
    filters.symbol !== 'all' ||
    filters.result !== 'all' ||
    filters.journalStatus !== 'all' ||
    filters.strategyId !== 'all'

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
      {/* Search & Toggle Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Cari simbol (contoh: EURUSD) atau Ticket ID..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all min-h-[40px]"
          />
          {filters.search && (
            <button
              onClick={() => handleChange('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpandedMobile(!isExpandedMobile)}
          className="md:hidden shrink-0 text-xs gap-1.5"
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filter</span>
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isExpandedMobile && 'rotate-180'
            )}
          />
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="hidden md:flex text-xs text-muted-foreground hover:text-destructive shrink-0"
          >
            Reset Filter
          </Button>
        )}
      </div>

      {/* Filter Inputs Grid */}
      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1',
          !isExpandedMobile && 'hidden md:grid'
        )}
      >
        {/* Symbol Select */}
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1 uppercase">
            Simbol
          </label>
          <select
            value={filters.symbol}
            onChange={(e) => handleChange('symbol', e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]"
          >
            <option value="all">Semua Simbol</option>
            <option value="EURUSD">EURUSD</option>
            <option value="XAUUSD">XAUUSD (Gold)</option>
            <option value="GBPUSD">GBPUSD</option>
            <option value="USDJPY">USDJPY</option>
            <option value="AUDUSD">AUDUSD</option>
            <option value="GBPJPY">GBPJPY</option>
          </select>
        </div>

        {/* Result Select */}
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1 uppercase">
            Hasil Trade
          </label>
          <select
            value={filters.result}
            onChange={(e) => handleChange('result', e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]"
          >
            <option value="all">Semua Hasil</option>
            <option value="profit">Profit Only (+)</option>
            <option value="loss">Loss Only (-)</option>
          </select>
        </div>

        {/* Journal Status Select */}
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1 uppercase">
            Status Jurnal
          </label>
          <select
            value={filters.journalStatus}
            onChange={(e) => handleChange('journalStatus', e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]"
          >
            <option value="all">Semua Status</option>
            <option value="complete">Lengkap</option>
            <option value="incomplete">Belum Lengkap</option>
          </select>
        </div>

        {/* Strategy Select */}
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1 uppercase">
            Strategi
          </label>
          <select
            value={filters.strategyId}
            onChange={(e) => handleChange('strategyId', e.target.value)}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[40px]"
          >
            <option value="all">Semua Strategi</option>
            {DUMMY_STRATEGIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex md:hidden justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            Reset Filter
          </Button>
        </div>
      )}
    </div>
  )
}
