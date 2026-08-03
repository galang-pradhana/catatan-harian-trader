import React from 'react'
import { Trophy, Flame, AlertOctagon, Zap, Calendar } from 'lucide-react'
import { PerformanceHighlights as HighlightsType } from '@/types/dashboard'

export interface PerformanceHighlightsProps {
  highlights: HighlightsType
}

export function PerformanceHighlights({ highlights }: PerformanceHighlightsProps) {
  return (
    <div className="bg-card/70 border border-border/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3 border-b border-border/50 pb-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          <span>Sorotan & Rekor Performa (Highlights)</span>
        </h3>
        <span className="text-[10px] text-muted-foreground">Statistik Ekstrem Bulan Ini</span>
      </div>

      {/* Compact Horizontal Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* 1. Best Day */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div>
            <span className="text-[10px] text-muted-foreground block font-semibold">Hari Terbaik</span>
            <span className="font-mono text-xs font-extrabold text-emerald-500">
              {highlights.bestDay ? `+$${highlights.bestDay.pnl.toFixed(2)}` : 'N/A'}
            </span>
          </div>
          <Trophy className="h-4 w-4 text-emerald-500 shrink-0" />
        </div>

        {/* 2. Worst Day */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-destructive/10 border border-destructive/20">
          <div>
            <span className="text-[10px] text-muted-foreground block font-semibold">Hari Terburuk</span>
            <span className="font-mono text-xs font-extrabold text-destructive">
              {highlights.worstDay ? `-$${Math.abs(highlights.worstDay.pnl).toFixed(2)}` : 'N/A'}
            </span>
          </div>
          <AlertOctagon className="h-4 w-4 text-destructive shrink-0" />
        </div>

        {/* 3. Max Win Streak */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <div>
            <span className="text-[10px] text-muted-foreground block font-semibold">Win Streak Maks</span>
            <span className="font-mono text-xs font-extrabold text-amber-400">
              {highlights.maxWinStreak} Win
            </span>
          </div>
          <Flame className="h-4 w-4 text-amber-500 fill-amber-500/30 shrink-0" />
        </div>

        {/* 4. Max Loss Streak */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60">
          <div>
            <span className="text-[10px] text-muted-foreground block font-semibold">Loss Streak Maks</span>
            <span className="font-mono text-xs font-extrabold text-foreground">
              {highlights.maxLossStreak} Loss
            </span>
          </div>
          <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        {/* 5. Most Trades Day */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 border border-border/60 col-span-2 sm:col-span-1">
          <div>
            <span className="text-[10px] text-muted-foreground block font-semibold">Terbanyak Trade</span>
            <span className="font-mono text-xs font-extrabold text-foreground">
              {highlights.mostTradesDay?.count ?? 0} Trade
            </span>
          </div>
          <Calendar className="h-4 w-4 text-primary shrink-0" />
        </div>
      </div>
    </div>
  )
}
