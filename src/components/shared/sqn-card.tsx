'use client'

import React from 'react'
import { Award, AlertCircle } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

export interface SqnCardProps {
  sqnScore?: number
  sampleCount?: number
}

function getSqnRating(score: number): { label: string; badgeClass: string } {
  if (score >= 3.0) {
    return { label: 'Sangat Baik (Holy Grail)', badgeClass: 'bg-primary/20 text-primary border-primary/40' }
  }
  if (score >= 2.5) {
    return { label: 'Baik (Profitable)', badgeClass: 'bg-profit/20 text-profit border-profit/40' }
  }
  if (score >= 1.6) {
    return { label: 'Rata-Rata (Rata-rata)', badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/40' }
  }
  return { label: 'Kurang (Perlu Perbaikan)', badgeClass: 'bg-loss/20 text-loss border-loss/40' }
}

export function SqnCard({ sqnScore = 2.65, sampleCount = 28 }: SqnCardProps) {
  const rating = getSqnRating(sqnScore)
  const isSmallSample = sampleCount < 20

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between hover:border-primary/30 transition-all">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Award className="h-4 w-4 text-primary" /> Skor Kualitas Sistem (SQN)
        </span>
        <StatTooltip
          title="SQN (Skor Kualitas Sistem)"
          definition="System Quality Number — mengukur konsistensi & keandalan edge sistem trading Anda berdasarkan expectancy dan variasi hasil. Diciptakan oleh Dr. Van Tharp."
          interpretation="Skala: <1.0 Buruk, 1.0-2.0 Rata-rata, 2.0-3.0 Baik, 3.0-5.0 Sangat Baik, >5.0 Luar Biasa (jarang dicapai)."
          formula="SQN = (Mean R-multiple / StdDev R-multiple) × √min(n, 100)"
        />
      </div>

      <div className="space-y-2 py-1">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-mono font-extrabold text-foreground tracking-tight">
            {sqnScore.toFixed(2)}
          </span>
          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', rating.badgeClass)}>
            {rating.label}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Berdasarkan sampel {sampleCount} trade closed dengan data R-multiple terisi.
        </p>

        {isSmallSample && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl flex items-center gap-2 text-[10px] text-amber-500 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Sampel masih kecil (&lt; 20 trade). Hasil lumayan tentatif secara statistik.</span>
          </div>
        )}
      </div>
    </div>
  )
}
