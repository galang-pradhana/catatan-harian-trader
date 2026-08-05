'use client'

import React from 'react'
import { Brain, ShieldAlert, ShieldCheck, AlertCircle, Award } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

export interface MoodItem {
  mood: string
  label: string
  trades: number
  winRate: number
  pnl: number
}

export interface DisciplineItem {
  discipline: string
  label: string
  trades: number
  winRate: number
  pnl: number
}

export interface MistakeTagItem {
  tag: string
  count: number
  pnl: number
}

interface PsychologyAnalysisCardProps {
  moods: MoodItem[]
  discipline: DisciplineItem[]
  topMistakes: MistakeTagItem[]
}

export function PsychologyAnalysisCard({
  moods,
  discipline,
  topMistakes
}: PsychologyAnalysisCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span>Psikologi &amp; Kedisiplinan Trading (Cross-Analysis)</span>
            </h3>
            <StatTooltip
              title="Cross-analysis Psikologi vs Hasil"
              definition="Menghubungkan kondisi emosi & kedisiplinan saat entry dengan hasil trade, untuk mengidentifikasi pola psikologi yang merugikan performa Anda."
              interpretation="Bandingkan win rate saat 'Ikut Rules' vs 'Melanggar Rules'. Biasanya trade melanggar rules (FOMO/Serakah) menghasilkan Win Rate & PnL paling buruk."
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Korelasi antara emosi entry, kedisiplinan aturan, dan rekam jejak kesalahan trading.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Discipline Comparison (Rules Followed vs Violations) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Kedisiplinan Aturan (Rules)</span>
          </h4>

          <div className="space-y-2.5">
            {discipline.map((d) => {
              const isRulesFollowed = d.discipline === 'yes'
              const isProfit = d.pnl >= 0

              return (
                <div
                  key={d.discipline}
                  className={cn(
                    'p-3.5 rounded-xl border text-xs space-y-1.5',
                    isRulesFollowed
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/40'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-foreground flex items-center gap-1.5">
                      {isRulesFollowed ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span>{d.label}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-muted-foreground">
                      {d.trades} Trade ({d.winRate}% WR)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/40 font-mono">
                    <span className="text-[10px] text-muted-foreground font-sans">Net PnL</span>
                    <span className={cn('font-bold text-sm', isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                      {isProfit ? '+' : ''}${d.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. Emotional State Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Kondisi Emosi Saat Entry</span>
          </h4>

          <div className="space-y-2">
            {moods.map((m) => {
              const isProfit = m.pnl >= 0
              return (
                <div
                  key={m.mood}
                  className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-semibold text-foreground font-sans">{m.label}</span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[11px] text-muted-foreground">
                      {m.trades} T ({m.winRate}%)
                    </span>
                    <span className={cn('font-bold text-xs w-20 text-right', isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                      {isProfit ? '+' : ''}${m.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 3. Top Mistake Tags Ranking */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Ranking Tag Kesalahan Terbanyak</span>
          </h4>

          {topMistakes.length === 0 ? (
            <div className="p-4 rounded-xl bg-muted/20 border border-border text-center text-xs text-muted-foreground">
              Belum ada catatan tag kesalahan tercatat pada periode ini.
            </div>
          ) : (
            <div className="space-y-2">
              {topMistakes.map((item, idx) => (
                <div
                  key={item.tag}
                  className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono font-bold text-[10px] flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-foreground">{item.tag}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-muted-foreground font-semibold">{item.count}x</span>
                    <span className="text-red-700 dark:text-red-400 font-bold">${item.pnl.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
