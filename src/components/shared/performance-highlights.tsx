import React from 'react'
import { Trophy, Flame, AlertOctagon, Zap, Calendar } from 'lucide-react'
import { PerformanceHighlights as HighlightsType } from '@/types/dashboard'

export interface PerformanceHighlightsProps {
  highlights: HighlightsType
}

export function PerformanceHighlights({ highlights }: PerformanceHighlightsProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="border-b border-border pb-3">
        <h3 className="text-base font-bold text-foreground">
          Sorotan Performa (Highlights)
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Rekor trading terbaik, terburuk, dan streak beruntun
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* 1. Best Day */}
        <div className="bg-profit/10 border border-profit/30 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-profit">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Hari Terbaik
            </span>
            <Trophy className="h-4 w-4" />
          </div>
          <p className="font-mono font-extrabold text-profit text-lg">
            {highlights.bestDay ? `+$${highlights.bestDay.pnl.toFixed(2)}` : 'N/A'}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">
            {highlights.bestDay?.date ?? '-'}
          </p>
        </div>

        {/* 2. Worst Day */}
        <div className="bg-loss/10 border border-loss/30 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-loss">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Hari Terburuk
            </span>
            <AlertOctagon className="h-4 w-4" />
          </div>
          <p className="font-mono font-extrabold text-loss text-lg">
            {highlights.worstDay ? `-$${Math.abs(highlights.worstDay.pnl).toFixed(2)}` : 'N/A'}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">
            {highlights.worstDay?.date ?? '-'}
          </p>
        </div>

        {/* 3. Max Win Streak */}
        <div className="bg-secondary/60 border border-border/60 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-amber-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              Win Streak Maks
            </span>
            <Flame className="h-4 w-4 fill-amber-500" />
          </div>
          <p className="font-mono font-extrabold text-foreground text-lg">
            {highlights.maxWinStreak} <span className="text-xs font-normal text-muted-foreground">Trade Win</span>
          </p>
          <p className="text-[10px] text-profit font-medium">Kemenangan Beruntun</p>
        </div>

        {/* 4. Max Loss Streak */}
        <div className="bg-secondary/60 border border-border/60 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              Loss Streak Maks
            </span>
            <Zap className="h-4 w-4" />
          </div>
          <p className="font-mono font-extrabold text-foreground text-lg">
            {highlights.maxLossStreak} <span className="text-xs font-normal text-muted-foreground">Trade Loss</span>
          </p>
          <p className="text-[10px] text-loss font-medium">Kekalahan Beruntun</p>
        </div>

        {/* 5. Most Trades Day */}
        <div className="bg-secondary/60 border border-border/60 p-3.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-primary">
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              Terbanyak Trade
            </span>
            <Calendar className="h-4 w-4" />
          </div>
          <p className="font-mono font-extrabold text-foreground text-lg">
            {highlights.mostTradesDay?.count ?? 0}{' '}
            <span className="text-xs font-normal text-muted-foreground">Trade</span>
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">
            {highlights.mostTradesDay?.date ?? '-'}
          </p>
        </div>
      </div>
    </div>
  )
}
