'use client'

import React from 'react'
import { Target, AlertCircle } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

interface MfeCategory {
  label: string
  key: string
  count: number
  pct: number
  description: string
}

interface MfeDistribution {
  total: number
  avgPercent: number
  isSmallSample: boolean
  categories: MfeCategory[]
}

interface MfeHistogramChartProps {
  distribution: MfeDistribution
}

const CATEGORY_STYLES: Record<string, { bar: string; badge: string; icon: string }> = {
  premature: {
    bar: 'bg-gradient-to-t from-red-600 to-red-400 dark:from-red-700 dark:to-red-500',
    badge: 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700/50',
    icon: '⚡',
  },
  optimal: {
    bar: 'bg-gradient-to-t from-emerald-600 to-emerald-400 dark:from-emerald-700 dark:to-emerald-500',
    badge: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50',
    icon: '✓',
  },
  overheld: {
    bar: 'bg-gradient-to-t from-amber-500 to-amber-300 dark:from-amber-600 dark:to-amber-400',
    badge: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50',
    icon: '⚠',
  },
}

export function MfeHistogramChart({ distribution }: MfeHistogramChartProps) {
  const maxPct = Math.max(...distribution.categories.map(c => c.pct), 1)

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Distribusi MFE Exit</span>
            </h3>
            <StatTooltip
              title="MFE (Efisiensi Exit)"
              definition="Maximum Favorable Excursion — persentase dari potensi profit maksimal yang benar-benar Anda ambil sebelum close position. Angka rendah menandakan premature exit (keluar terlalu cepat), angka mendekati 100% menandakan Anda konsisten menangkap potensi profit maksimal."
              interpretation="Distribusi Premature Exit tinggi → gunakan trailing stop. Exit Optimal dominan → strategi exit Anda sudah bagus. Overheld banyak → risiko profit terkikis saat reversal."
              formula="Exit Efficiency = (Actual Profit / MFE Potential) × 100"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Kelompokkan trade berdasarkan kualitas eksekusi exit
          </p>
        </div>

        {/* Avg badge */}
        <div className={cn(
          'px-3 py-1.5 rounded-xl border text-xs font-mono text-right',
          distribution.avgPercent >= 75
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-700/50'
            : distribution.avgPercent >= 50
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-700/50'
            : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-700/50'
        )}>
          <span className="text-[10px] text-muted-foreground font-sans block">Avg MFE Efficiency</span>
          <span className={cn(
            'font-extrabold text-sm',
            distribution.avgPercent >= 75
              ? 'text-emerald-700 dark:text-emerald-400'
              : distribution.avgPercent >= 50
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-red-700 dark:text-red-400'
          )}>
            {distribution.avgPercent}%
          </span>
        </div>
      </div>

      {distribution.total === 0 ? (
        <div className="h-36 flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
          <Target className="h-8 w-8 opacity-20" />
          <p>Belum ada data MFE. Data MFE tersedia dari hasil import CSV MT5.</p>
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="flex items-end gap-4 h-36 px-2">
            {distribution.categories.map(cat => {
              const style = CATEGORY_STYLES[cat.key] || CATEGORY_STYLES.optimal
              const barH = maxPct > 0 ? (cat.pct / maxPct) * 100 : 0

              return (
                <div key={cat.key} className="flex-1 flex flex-col items-center gap-2 group">
                  {/* Bar */}
                  <div className="w-full flex flex-col items-center justify-end h-28 relative">
                    <div
                      className={cn('w-full rounded-t-lg transition-all duration-700 ease-out relative', style.bar)}
                      style={{ height: `${Math.max(barH, 4)}%` }}
                    >
                      {/* Count label on bar */}
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-foreground whitespace-nowrap">
                        {cat.count}
                      </span>
                    </div>
                  </div>

                  {/* Percentage badge */}
                  <span className={cn('text-[10px] font-extrabold px-2 py-0.5 rounded-full border font-mono', style.badge)}>
                    {style.icon} {cat.pct}%
                  </span>

                  {/* Label */}
                  <span className="text-[10px] text-muted-foreground text-center leading-tight font-medium">
                    {cat.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Category descriptions */}
          <div className="space-y-1.5 border-t border-border/50 pt-3">
            {distribution.categories.map(cat => {
              const style = CATEGORY_STYLES[cat.key] || CATEGORY_STYLES.optimal
              return (
                <div key={cat.key} className="flex items-start gap-2 text-[11px]">
                  <span className={cn('shrink-0 px-1.5 py-0.5 rounded font-bold text-[9px] border mt-px', style.badge)}>
                    {cat.count} Trade
                  </span>
                  <span className="text-muted-foreground">{cat.description}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Small sample warning */}
      {distribution.isSmallSample && distribution.total > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl flex items-center gap-2 text-[10px] text-amber-500 font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Sampel &lt;20 trade dengan data MFE. Hasil bersifat tentatif secara statistik.</span>
        </div>
      )}
    </div>
  )
}
