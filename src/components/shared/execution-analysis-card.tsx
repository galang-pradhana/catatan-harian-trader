'use client'

import React from 'react'
import { Target, Zap, ShieldCheck, ArrowRightLeft } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

interface ExecutionAnalysisCardProps {
  avgPlannedRR: number
  avgActualRR: number
  avgMfeEfficiency: number
}

export function ExecutionAnalysisCard({
  avgPlannedRR,
  avgActualRR,
  avgMfeEfficiency
}: ExecutionAnalysisCardProps) {
  const rrDelta = Math.round((avgActualRR - avgPlannedRR) * 100) / 100
  const isRRMet = avgActualRR >= avgPlannedRR

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span>Analisis Kualitas Eksekusi (R:R &amp; MFE Exit Efficiency)</span>
            </h3>
            <StatTooltip
              title="Planned vs Actual R:R"
              definition="Perbandingan rasio risk-reward yang direncanakan vs yang benar-benar terealisasi saat exit. Selisih besar menandakan sering premature exit atau melebihi SL rencana."
              interpretation="Idealnya Actual R:R mendekati atau melebihi Planned R:R. Jika Actual R:R jauh lebih rendah, evaluasi apakah Anda terlalu sering cut profit terlalu cepat."
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Evaluasi kepatuhan target Risk-to-Reward &amp; efisiensi penutupan harga puncak (MFE).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Planned R:R vs Actual R:R Card */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ArrowRightLeft className="h-4 w-4 text-primary" /> Planned R:R vs Actual R:R
            </span>
            <span
              className={cn(
                'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border',
                isRRMet
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-700/50'
              )}
            >
              {isRRMet ? 'Sesuai Rencana' : `Selisih ${rrDelta}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center pt-1 font-mono">
            <div className="bg-card border border-border p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-sans text-muted-foreground block uppercase font-semibold">Planned R:R</span>
              <span className="text-lg font-black text-foreground block">1:{avgPlannedRR.toFixed(2)}</span>
            </div>

            <div className="bg-card border border-border p-3 rounded-xl space-y-1">
              <span className="text-[10px] font-sans text-muted-foreground block uppercase font-semibold">Actual R:R</span>
              <span className={cn('text-lg font-black block', isRRMet ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-800 dark:text-amber-400')}>
                1:{avgActualRR.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* 2. MFE Exit Efficiency Card */}
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-amber-500" /> MFE Exit Efficiency (%)
              </span>
              <StatTooltip
                title="MFE Exit Efficiency"
                definition="Tingkat efisiensi penutupan posisi dibandingkan dengan potensi profit puncaknya (MFE). Persentase tinggi menunjukkan exit yang disiplin mendekati titik puncak."
                interpretation="MFE > 70% tergolong eksekusi exit yang sangat baik. Jika MFE < 50%, menandakan sering membiarkan floating profit yang besar kembali menjadi TP minimal atau kerugian."
                formula="MFE Efficiency (%) = (Close Profit / Peak Floating Profit) × 100"
              />
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
              {avgMfeEfficiency >= 70 ? 'Optimal' : 'Perlu Evaluasi'}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-muted-foreground font-sans">Efisiensi Rata-rata Exit:</span>
              <span className="font-extrabold text-foreground text-sm">{avgMfeEfficiency}%</span>
            </div>

            <div className="h-2.5 w-full bg-card rounded-full overflow-hidden p-0.5 border border-border">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-primary to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, avgMfeEfficiency))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
