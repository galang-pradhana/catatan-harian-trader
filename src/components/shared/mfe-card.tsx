'use client'

import React from 'react'
import { Target, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MfeCardProps {
  efficiencyPercent?: number // 0 - 100
  excludedCount?: number
}

export function MfeCard({ efficiencyPercent = 74, excludedCount = 0 }: MfeCardProps) {
  const percent = Math.min(Math.max(efficiencyPercent, 0), 100)
  const strokeDashoffset = 251.2 - (251.2 * percent) / 100

  // Color grade
  const colorClass =
    percent >= 75
      ? 'text-profit stroke-profit'
      : percent >= 50
      ? 'text-amber-500 stroke-amber-500'
      : 'text-loss stroke-loss'

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Target className="h-4 w-4 text-primary" /> Efisiensi Exit (MFE)
        </span>
        <div className="group relative">
          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />
          <div className="absolute right-0 top-6 hidden group-hover:block w-56 p-2.5 bg-popover text-popover-foreground border border-border rounded-xl text-[11px] shadow-xl z-50 leading-normal">
            <strong>Maximum Favorable Excursion (MFE):</strong> Mengukur berapa persen dari puncak profit potensial yang berhasil direalisasikan sebelum trade ditutup.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 py-1">
        {/* SVG Circular Progress Ring */}
        <div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
          <svg className="h-20 w-20 transform -rotate-90" viewBox="0 0 90 90">
            {/* Background Circle */}
            <circle
              cx="45"
              cy="45"
              r="40"
              className="stroke-muted/30 fill-none"
              strokeWidth="7"
            />
            {/* Progress Circle */}
            <circle
              cx="45"
              cy="45"
              r="40"
              className={cn('fill-none transition-all duration-1000 ease-out', colorClass)}
              strokeWidth="7"
              strokeDasharray="251.2"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-base font-mono font-extrabold text-foreground">
            {percent}%
          </span>
        </div>

        <div className="space-y-1">
          <h4 className="text-xs font-bold text-foreground">
            {percent >= 75 ? 'Exit Sangat Presisi' : percent >= 50 ? 'Exit Cukup Baik' : 'Prematur Exit / Greed'}
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Rata-rata {percent}% dari puncak MFE terealisasi saat close position.
          </p>
          {excludedCount > 0 && (
            <p className="text-[10px] text-amber-500 font-medium pt-0.5">
              * {excludedCount} trade CSV import tidak memiliki data MFE.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
