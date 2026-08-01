'use client'

import React, { useState } from 'react'
import { ArrowUpDown } from 'lucide-react'
import { SymbolPerformance } from '@/types/dashboard'
import { cn } from '@/lib/utils'

export interface SymbolPerformanceTableProps {
  data: SymbolPerformance[]
}

type SortField = 'symbol' | 'trades' | 'winRate' | 'pnl'

export function SymbolPerformanceTable({ data }: SymbolPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('pnl')
  const [sortAsc, setSortAsc] = useState(false)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const sortedData = [...data].sort((a, b) => {
    let aVal: any = a[sortField]
    let bVal: any = b[sortField]
    if (sortField === 'symbol') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return sortAsc ? aVal - bVal : bVal - aVal
  })

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="text-base font-bold text-foreground">
          Breakdown Performa per Simbol
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Statistik perbandingan Win Rate & PnL berdasarkan instrumen trading
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <th className="py-3 px-3">
                <button
                  onClick={() => handleSort('symbol')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Simbol <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-center">
                <button
                  onClick={() => handleSort('trades')}
                  className="flex items-center gap-1 mx-auto hover:text-foreground"
                >
                  Trades <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-center">Wins / Losses</th>
              <th className="py-3 px-3 text-center">
                <button
                  onClick={() => handleSort('winRate')}
                  className="flex items-center gap-1 mx-auto hover:text-foreground"
                >
                  Win Rate <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
              <th className="py-3 px-3 text-right">
                <button
                  onClick={() => handleSort('pnl')}
                  className="flex items-center gap-1 ml-auto hover:text-foreground"
                >
                  Net PnL <ArrowUpDown className="h-3 w-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sortedData.map((row) => {
              const isProfit = row.pnl >= 0
              return (
                <tr key={row.symbol} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 px-3 font-bold text-foreground">
                    {row.symbol}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-medium">
                    {row.trades}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono">
                    <span className="text-profit font-bold">{row.wins}W</span> /{' '}
                    <span className="text-loss font-bold">{row.losses}L</span>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono font-bold text-foreground">
                    {row.winRate.toFixed(1)}%
                  </td>
                  <td
                    className={cn(
                      'py-3.5 px-3 text-right font-mono font-extrabold text-sm',
                      isProfit ? 'text-profit' : 'text-loss'
                    )}
                  >
                    {isProfit ? '+' : ''}${row.pnl.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
