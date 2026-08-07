'use client'

import React, { useState } from 'react'
import { Sparkles, ArrowUpDown, AlertCircle, ExternalLink } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

export interface StrategyRankingItem {
  id: string
  name: string
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

interface StrategyRankingTableProps {
  data: StrategyRankingItem[]
  dataCompleteness: number // 0-100, % of trades that have a strategy assigned
  totalTrades: number
}

type SortKey = 'sqn' | 'expectancy' | 'winRate' | 'profitFactor' | 'pnl'

function getSqnColor(sqn: number) {
  if (sqn >= 3.0) return 'text-yellow-600 dark:text-yellow-400'
  if (sqn >= 2.0) return 'text-emerald-700 dark:text-emerald-400'
  if (sqn >= 1.0) return 'text-amber-700 dark:text-amber-400'
  return 'text-red-700 dark:text-red-400'
}

export function StrategyRankingTable({ data, dataCompleteness, totalTrades }: StrategyRankingTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('sqn')
  const [showAll, setShowAll] = useState(false)

  const sorted = [...data].sort((a, b) => {
    if (sortBy === 'sqn') return b.sqn - a.sqn
    if (sortBy === 'expectancy') return b.expectancy - a.expectancy
    if (sortBy === 'winRate') return b.winRate - a.winRate
    if (sortBy === 'profitFactor') return b.profitFactor - a.profitFactor
    return b.pnl - a.pnl
  })

  const displayed = showAll ? sorted : sorted.slice(0, 8)
  const topSqn = sorted.length > 0 ? sorted[0] : null
  const bottomSqn = sorted.length > 0 ? sorted[sorted.length - 1] : null

  const sortButtons: { id: SortKey; label: string }[] = [
    { id: 'sqn', label: 'SQN' },
    { id: 'expectancy', label: 'Expectancy' },
    { id: 'winRate', label: 'Win Rate' },
    { id: 'profitFactor', label: 'Profit Factor' },
  ]

  const noStrategyData = totalTrades > 0 && dataCompleteness < 30

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Ranking Strategi / Setup</span>
            </h3>
            <StatTooltip
              title="Ranking Strategi"
              definition="Peringkat strategi trading berdasarkan SQN, Expectancy, dan Win Rate. Membantu identifikasi setup mana yang paling konsisten menghasilkan edge."
              interpretation="Strategi dengan SQN tertinggi menunjukkan setup paling konsisten dan valid secara statistik. Pertimbangkan fokus hanya pada top-2 strategi terbaik Anda."
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Analisis kualitas sistem per strategi/setup trading
          </p>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground font-semibold shrink-0 flex items-center gap-1">
            <ArrowUpDown className="h-3.5 w-3.5" /> Urutkan:
          </span>
          <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1 flex-wrap">
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

      {/* Low completeness CTA */}
      {noStrategyData && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3 text-xs">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p className="font-bold text-foreground">Data Strategi Belum Lengkap</p>
            <p className="text-muted-foreground leading-relaxed">
              Hanya {dataCompleteness}% trade yang memiliki strategi/setup tercatat. Isi data strategi di setiap jurnal trade untuk analisis yang akurat.
            </p>
            <a
              href="/strategies"
              className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline mt-1"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka halaman Strategi & Tag →
            </a>
          </div>
        </div>
      )}

      {/* Data completeness bar */}
      {totalTrades > 0 && (
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-muted-foreground shrink-0">Kelengkapan data strategi:</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', dataCompleteness >= 70 ? 'bg-emerald-500' : dataCompleteness >= 40 ? 'bg-amber-500' : 'bg-red-500')}
              style={{ width: `${dataCompleteness}%` }}
            />
          </div>
          <span className={cn('font-mono font-bold shrink-0', dataCompleteness >= 70 ? 'text-emerald-700 dark:text-emerald-400' : dataCompleteness >= 40 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400')}>
            {dataCompleteness}%
          </span>
        </div>
      )}

      {data.length === 0 ? (
        <div className="p-8 text-center space-y-3">
          <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground">Belum ada data strategi. Tambahkan tag strategi ke jurnal trade Anda.</p>
          <a href="/strategies" className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> Atur Strategi →
          </a>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border font-semibold">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Strategi</th>
                  <th className="py-3 px-3">Trade</th>
                  <th className="py-3 px-3">SQN</th>
                  <th className="py-3 px-3">Expectancy</th>
                  <th className="py-3 px-3">Win Rate</th>
                  <th className="py-3 px-3">Profit Factor</th>
                  <th className="py-3 px-3 text-right">Net PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayed.map((item, idx) => {
                  const isTop = topSqn?.id === item.id && item.sqn >= 2.0
                  const isBottom = bottomSqn?.id === item.id && item.sqn < 1.0
                  const isProfit = item.pnl >= 0

                  return (
                    <tr
                      key={item.id}
                      className={cn(
                        'transition-colors hover:bg-muted/20',
                        isTop && 'bg-emerald-50/40 dark:bg-emerald-950/10',
                        isBottom && 'bg-red-50/40 dark:bg-red-950/10'
                      )}
                    >
                      <td className="py-3 px-3 text-muted-foreground font-mono text-[11px]">{idx + 1}</td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-foreground">{item.name}</span>
                          {isTop && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50 w-fit">
                              ⭐ Setup Terbaik
                            </span>
                          )}
                          {isBottom && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700/50 w-fit">
                              ⚠ Perlu Evaluasi
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

          {sorted.length > 8 && (
            <button
              onClick={() => setShowAll(prev => !prev)}
              className="w-full text-center text-xs text-primary font-bold hover:underline py-1"
            >
              {showAll ? 'Sembunyikan ↑' : `Lihat semua ${sorted.length} strategi →`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
