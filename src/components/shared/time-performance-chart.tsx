'use client'

import React from 'react'
import { Calendar, Clock, Sun, Moon, Globe } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

export interface DayPerformance {
  day: string
  trades: number
  winRate: number
  pnl: number
}

export interface SessionPerformance {
  session: string
  trades: number
  winRate: number
  pnl: number
}

interface TimePerformanceChartProps {
  days: DayPerformance[]
  sessions: SessionPerformance[]
}

export function TimePerformanceChart({ days, sessions }: TimePerformanceChartProps) {
  const maxPnl = Math.max(1, ...days.map((d) => Math.abs(d.pnl)))

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Analisis Performa Waktu (Day &amp; Session)</span>
            </h3>
            <StatTooltip
              title="Performa per Sesi/Hari"
              definition="Menunjukkan waktu (hari/sesi trading) dengan performa terbaik dan terburuk, untuk membantu Anda fokus pada waktu paling produktif."
              interpretation="Identifikasi hari dan sesi dengan Win Rate & Net PnL konsisten tinggi. Hindari trading pada hari/sesi yang sering mengalami kerugian beruntun."
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Distribusi hasil trade berdasarkan hari dalam seminggu &amp; sesi pasar (Asia/London/NY).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Day of Week Bar Chart */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Performa per Hari (Senin - Minggu)</span>
          </h4>

          <div className="space-y-2">
            {days.map((d) => {
              const isProfit = d.pnl >= 0
              const barWidth = Math.min(100, Math.max(10, (Math.abs(d.pnl) / maxPnl) * 100))

              return (
                <div key={d.day} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-foreground font-sans w-16">{d.day}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {d.trades} Trade ({d.winRate}% WR)
                    </span>
                    <span className={cn('font-bold font-mono text-xs', isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                      {isProfit ? '+' : ''}${d.pnl.toFixed(2)}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/40">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        isProfit ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-red-600 dark:bg-red-500'
                      )}
                      style={{ width: d.trades > 0 ? `${barWidth}%` : '0%' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 2. Trading Session Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Performa per Sesi Pasar</span>
          </h4>

          <div className="grid grid-cols-1 gap-3">
            {sessions.map((s) => {
              const isProfit = s.pnl >= 0
              return (
                <div
                  key={s.session}
                  className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center font-bold text-xs text-primary">
                      {s.session.includes('Asia') ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="font-extrabold text-foreground block">{s.session}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {s.trades} Trade ({s.winRate}% Win Rate)
                      </span>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-[10px] text-muted-foreground block font-sans uppercase">Net PnL</span>
                    <span className={cn('font-bold text-sm', isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                      {isProfit ? '+' : ''}${s.pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
