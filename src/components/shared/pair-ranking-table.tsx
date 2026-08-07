'use client'

import React, { useState } from 'react'
import { PieChart, ArrowUpDown, AlertCircle, Star, Ban } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

export interface PairRankingItem {
  symbol: string
  tradeCount: number
  winRate: number
  profitFactor: number
  expectancy: number
  sqn: number
  sqnRating: string
  sqnSampleCount: number
  isSmallSample: boolean
  pnl: number
}

interface PairRankingTableProps {
  data: PairRankingItem[]
}

type SortKey = 'sqn' | 'expectancy' | 'winRate' | 'profitFactor' | 'pnl'

function getSqnBadge(sqn: number, isTop: boolean, isBottom: boolean) {
  if (isTop && sqn >= 2.0) return {
    label: '⭐ Fokus di sini',
    class: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50',
  }
  if (isBottom && sqn < 1.0) return {
    label: '⚠ Pertimbangkan hindari',
    class: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700/50',
  }
  return null
}

function getSqnColor(sqn: number) {
  if (sqn >= 3.0) return 'text-yellow-600 dark:text-yellow-400'
  if (sqn >= 2.0) return 'text-emerald-700 dark:text-emerald-400'
  if (sqn >= 1.0) return 'text-amber-700 dark:text-amber-400'
  return 'text-red-700 dark:text-red-400'
}

export function PairRankingTable({ data }: PairRankingTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('sqn')

  const sorted = [...data].sort((a, b) => {
    if (sortBy === 'sqn') return b.sqn - a.sqn
    if (sortBy === 'expectancy') return b.expectancy - a.expectancy
    if (sortBy === 'winRate') return b.winRate - a.winRate
    if (sortBy === 'profitFactor') return b.profitFactor - a.profitFactor
    return b.pnl - a.pnl
  })

  const topSqnSymbol = sorted.length > 0 ? sorted[0].symbol : null
  const bottomSqnSymbol = sorted.length > 0 ? sorted[sorted.length - 1].symbol : null

  const sortButtons: { id: SortKey; label: string }[] = [
    { id: 'sqn', label: 'SQN' },
    { id: 'expectancy', label: 'Expectancy' },
    { id: 'winRate', label: 'Win Rate' },
    { id: 'profitFactor', label: 'Profit Factor' },
    { id: 'pnl', label: 'Net PnL' },
  ]

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <span>Ranking Pair / Instrumen</span>
            </h3>
            <StatTooltip
              title="Ranking Pair / Instrumen"
              definition="Peringkat instrumen berdasarkan SQN, Expectancy, Win Rate, dan Profit Factor. Berbeda dari halaman Statistik yang hanya menampilkan jumlah trade dan PnL."
              interpretation="Instrumen dengan SQN tertinggi menunjukkan performa paling konsisten; pertimbangkan alokasi fokus lebih besar ke instrumen tersebut. Instrumen dengan SQN negatif atau rendah sebaiknya dievaluasi apakah masih layak di-trade."
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Analisis kualitas sistem trading per instrumen
          </p>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 shrink-0">
            <ArrowUpDown className="h-3.5 w-3.5" /> Urutkan:
          </span>
          <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1 text-xs flex-wrap">
            {sortButtons.map(btn => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setSortBy(btn.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap',
                  sortBy === btn.id ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Belum ada data trade tertutup untuk analisis ranking instrumen.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Instrumen</th>
                <th className="py-3 px-3">Trade</th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <span>SQN</span>
                    <StatTooltip
                      align="left"
                      position="bottom"
                      title="SQN (System Quality Number)"
                      definition="Mengukur konsistensi & keandalan edge sistem trading Anda berdasarkan expectancy dan variasi hasil."
                      interpretation="<1.0 Buruk, 1.0-2.0 Rata-rata, 2.0-3.0 Baik, 3.0-5.0 Sangat Baik, >5.0 Luar Biasa (jarang dicapai)."
                      formula="SQN = (Mean R / StdDev R) × √n"
                    />
                  </div>
                </th>
                <th className="py-3 px-3">
                  <div className="flex items-center gap-1">
                    <span>Expectancy</span>
                    <StatTooltip
                      align="left"
                      position="bottom"
                      title="Expectancy"
                      definition="Ekspektasi untung/rugi rata-rata per trade. Angka positif berarti secara statistik sistem Anda menghasilkan profit dalam jangka panjang jika dijalankan konsisten."
                      interpretation="Expectancy positif = sistem valid. Semakin besar, semakin kuat edge Anda per trade."
                      formula="Expectancy = (Win Rate × Avg Win) - (Loss Rate × Avg Loss)"
                    />
                  </div>
                </th>
                <th className="py-3 px-3">Win Rate</th>
                <th className="py-3 px-3">Profit Factor</th>
                <th className="py-3 px-3 text-right">Net PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((item, idx) => {
                const isTop = item.symbol === topSqnSymbol
                const isBottom = item.symbol === bottomSqnSymbol
                const badge = getSqnBadge(item.sqn, isTop, isBottom)
                const isProfit = item.pnl >= 0

                return (
                  <tr
                    key={item.symbol}
                    className={cn(
                      'transition-colors hover:bg-muted/20',
                      isTop && item.sqn >= 2.0 && 'bg-emerald-50/40 dark:bg-emerald-950/10',
                      isBottom && item.sqn < 1.0 && 'bg-red-50/40 dark:bg-red-950/10'
                    )}
                  >
                    <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono font-bold text-foreground">{item.symbol}</span>
                        {badge && (
                          <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border w-fit', badge.class)}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono text-foreground">{item.tradeCount}</span>
                        {item.isSmallSample && (
                          <span className="flex items-center gap-0.5 text-[9px] text-amber-500 font-medium">
                            <AlertCircle className="h-2.5 w-2.5" /> Sampel kecil
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className={cn('font-mono font-extrabold text-sm', getSqnColor(item.sqn))}>
                          {item.sqn.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{item.sqnRating}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className={cn('font-mono font-bold', item.expectancy >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                        {item.expectancy >= 0 ? '+' : ''}${item.expectancy.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={cn('font-mono font-bold', item.winRate >= 50 ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                        {item.winRate.toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span className={cn('font-mono font-bold', item.profitFactor >= 1.5 ? 'text-emerald-700 dark:text-emerald-400' : item.profitFactor >= 1.0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400')}>
                        {item.profitFactor >= 999 ? '∞' : item.profitFactor.toFixed(2)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <span className={cn('font-mono font-extrabold', isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                        {isProfit ? '+' : ''}${item.pnl.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
