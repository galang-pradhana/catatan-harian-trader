'use client'

import React from 'react'
import { CalendarDay } from '@/types/dashboard'
import { cn } from '@/lib/utils'

export interface PnLCalendarProps {
  days: Array<{ date: string; pnl: number | null; tradesCount: number } | CalendarDay>
  monthName?: string
}

const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function PnLCalendar({ days, monthName = 'Bulan Ini' }: PnLCalendarProps) {
  // Map day data by day number (1..31) or YYYY-MM-DD
  const dayMap = new Map<number, { pnl: number | null; tradesCount: number }>()

  let year = new Date().getFullYear()
  let month = new Date().getMonth() + 1 // 1-indexed

  days.forEach((d) => {
    if ('dayNumber' in d && typeof d.dayNumber === 'number') {
      dayMap.set(d.dayNumber, { pnl: d.pnl ?? null, tradesCount: d.tradesCount ?? 0 })
    } else if ('date' in d && d.date) {
      const parts = d.date.split('-').map(Number)
      if (parts.length === 3) {
        year = parts[0]
        month = parts[1]
        dayMap.set(parts[2], { pnl: d.pnl ?? null, tradesCount: d.tradesCount ?? 0 })
      }
    }
  })

  // Total days in month
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate()

  // First day of month day-of-week (0=Sun, 1=Mon, ..., 6=Sat)
  const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  // We want Monday = 0, Tuesday = 1, ..., Sunday = 6
  const paddingBefore = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-base font-bold text-foreground">
            Kalender Performa PnL ({monthName})
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hasil Profit/Loss harian dalam tampilan kalender bulanan
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-profit" /> Profit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-loss" /> Loss
          </span>
        </div>
      </div>

      {/* Grid Headers (Sen-Min) */}
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-muted-foreground uppercase py-1">
        {dayLabels.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {/* Blank Padding before 1st of month */}
        {Array.from({ length: paddingBefore }).map((_, i) => (
          <div
            key={`pad-${i}`}
            className="aspect-square sm:h-16 rounded-xl bg-muted/20 border border-border/30 opacity-30"
          />
        ))}

        {/* Month Days */}
        {Array.from({ length: totalDays }).map((_, i) => {
          const dayNum = i + 1
          const dayData = dayMap.get(dayNum)
          const pnl = dayData?.pnl
          const hasTrade = pnl !== null && pnl !== undefined
          const isProfit = (pnl || 0) >= 0

          // Construct YYYY-MM-DD date string
          const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`

          return (
            <div
              key={dayNum}
              onClick={() => {
                if (hasTrade) {
                  window.location.href = `/trades?date=${formattedDate}`
                }
              }}
              title={
                hasTrade
                  ? `Tanggal ${dayNum} ${monthName}: ${isProfit ? '+' : ''}$${Math.abs(pnl).toFixed(2)} (${dayData?.tradesCount || 0} trade). Klik untuk lihat detail.`
                  : `Tanggal ${dayNum} ${monthName}: Tidak ada trade`
              }
              className={cn(
                'aspect-square sm:h-16 rounded-xl p-1.5 border flex flex-col justify-between transition-all select-none',
                hasTrade
                  ? isProfit
                    ? 'bg-profit/15 border-profit/40 text-profit hover:bg-profit/25 hover:border-profit cursor-pointer hover:scale-[1.05] shadow-sm'
                    : 'bg-loss/15 border-loss/40 text-loss hover:bg-loss/25 hover:border-loss cursor-pointer hover:scale-[1.05] shadow-sm'
                  : 'bg-muted/20 border-border/40 text-muted-foreground opacity-75'
              )}
            >
              <span className="text-[10px] sm:text-xs font-bold leading-none">
                {dayNum}
              </span>
              {hasTrade && (
                <div className="text-right">
                  <span className="block text-[9px] sm:text-[11px] font-mono font-extrabold leading-none truncate">
                    {isProfit ? '+' : ''}${Math.abs(pnl).toFixed(0)}
                  </span>
                  <span className="text-[8px] opacity-75 font-sans leading-none hidden sm:block mt-0.5">
                    {dayData?.tradesCount || 0} trade
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

