'use client'

import React, { useState, useMemo } from 'react'
import { Filter, Search, X, RotateCcw, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FilterState {
  search: string
  symbol: string
  status: 'all' | 'open' | 'closed'
  result: 'all' | 'profit' | 'loss'
  journalStatus: 'all' | 'complete' | 'incomplete'
  strategyId: string
  source: 'all' | 'manual' | 'mt5_sync' | 'csv_import'
  month?: string
  date?: string
}

export interface TradeFilterProps {
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  onReset: () => void
}

function buildMonthOptions(): Array<{ value: string; label: string }> {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    options.push({ value, label: `${label}` })
  }
  return options
}

export function TradeFilter({ filters, onFilterChange, onReset }: TradeFilterProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const monthOptions = useMemo(() => buildMonthOptions(), [])

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value })
  }

  let activeFilterCount = 0
  if (filters.symbol !== 'all') activeFilterCount++
  if (filters.status !== 'all') activeFilterCount++
  if (filters.result !== 'all') activeFilterCount++
  if (filters.journalStatus !== 'all') activeFilterCount++
  if (filters.strategyId !== 'all') activeFilterCount++
  if (filters.source !== 'all') activeFilterCount++
  if (filters.month) activeFilterCount++
  if (filters.date) activeFilterCount++

  const hasActiveFilters = activeFilterCount > 0 || Boolean(filters.search)

  return (
    <div className="bg-card/80 border border-border/80 rounded-2xl p-3 sm:p-4 shadow-sm backdrop-blur-sm space-y-2.5">
      {/* Search Bar & Main Filter Button */}
      <div className="flex flex-col sm:flex-row items-center gap-2.5">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Cari simbol (EURUSD...) atau Ticket ID..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500 transition-all min-h-[38px]"
          />
          {filters.search && (
            <button
              onClick={() => handleChange('search', '')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end shrink-0">
          <button
            type="button"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer min-h-[38px]',
              activeFilterCount > 0
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-muted/30 border-border text-foreground hover:bg-muted'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="h-4.5 w-4.5 rounded-full bg-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isPanelOpen && 'rotate-180')} />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer min-h-[38px]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Chips with Fade-Gradient Scroll Affordance */}
      <div className="relative overflow-hidden w-full pt-0.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pr-8">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-0.5">
            Quick Filter:
          </span>

          <button
            type="button"
            onClick={() =>
              handleChange('journalStatus', filters.journalStatus === 'incomplete' ? 'all' : 'incomplete')
            }
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all shrink-0 cursor-pointer',
              filters.journalStatus === 'incomplete'
                ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-xs'
                : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            📝 Belum Diisi
          </button>

          <button
            type="button"
            onClick={() => handleChange('status', filters.status === 'open' ? 'all' : 'open')}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all shrink-0 cursor-pointer',
              filters.status === 'open'
                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            🟢 Posisi Running
          </button>

          <button
            type="button"
            onClick={() => handleChange('result', filters.result === 'loss' ? 'all' : 'loss')}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all shrink-0 cursor-pointer',
              filters.result === 'loss'
                ? 'bg-destructive text-white border-destructive font-bold shadow-xs'
                : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            🔴 Hit SL / Loss
          </button>

          <button
            type="button"
            onClick={() => handleChange('source', filters.source === 'manual' ? 'all' : 'manual')}
            className={cn(
              'px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all shrink-0 cursor-pointer',
              filters.source === 'manual'
                ? 'bg-blue-500 text-white border-blue-500 font-bold shadow-xs'
                : 'bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            ✍️ Manual Entry
          </button>

          {filters.month && (
            <button
              type="button"
              onClick={() => handleChange('month', '')}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>Bln: {monthOptions.find(m => m.value === filters.month)?.label || filters.month}</span>
              <X className="h-3 w-3" />
            </button>
          )}

          {filters.date && (
            <button
              type="button"
              onClick={() => handleChange('date', '')}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>Tgl: {filters.date}</span>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Fade Gradient di Ujung Kanan Quick Filter */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card via-card/80 to-transparent z-10" />
      </div>

      {/* Expanded Filter Panel Dropdown */}
      {isPanelOpen && (
        <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Filter Bulan
            </label>
            <select
              value={filters.month || ''}
              onChange={(e) => handleChange('month', e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
            >
              <option value="">Semua Bulan (All Time)</option>
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Status Posisi
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', (e.target.value as any))}
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Status (Open &amp; Closed)</option>
              <option value="open">🟢 Posisi Open (Running)</option>
              <option value="closed">🏁 Posisi Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Hasil Trade
            </label>
            <select
              value={filters.result}
              onChange={(e) => handleChange('result', (e.target.value as any))}
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Hasil</option>
              <option value="profit">🟢 Profit / Win</option>
              <option value="loss">🔴 Loss / Cut Loss</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Kelengkapan Jurnal
            </label>
            <select
              value={filters.journalStatus}
              onChange={(e) => handleChange('journalStatus', (e.target.value as any))}
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Status Jurnal</option>
              <option value="incomplete">⚠️ Belum Lengkap / Diisi</option>
              <option value="complete">✅ Sudah Lengkap</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Simbol / Pair
            </label>
            <select
              value={filters.symbol}
              onChange={(e) => handleChange('symbol', e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-amber-500"
            >
              <option value="all">Semua Simbol</option>
              <option value="XAUUSD">XAUUSD / Emas</option>
              <option value="EURUSD">EURUSD</option>
              <option value="GBPUSD">GBPUSD</option>
              <option value="USDJPY">USDJPY</option>
              <option value="BTCUSD">BTCUSD</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
              Sumber Data
            </label>
            <select
              value={filters.source}
              onChange={(e) => handleChange('source', (e.target.value as any))}
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-blue-500"
            >
              <option value="all">Semua Sumber</option>
              <option value="manual">✍️ Manual Entry</option>
              <option value="mt5_sync">🤖 MT5 / EA Sync</option>
              <option value="csv_import">📁 CSV Import</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
