'use client'

import React, { useState } from 'react'
import { TrendingUp, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

export interface EquityPoint {
  date: string
  cumulativePnl: number
  drawdownDollar: number
  drawdownPct: number
}

interface EquityDrawdownChartProps {
  equityCurve: EquityPoint[]
  maxDrawdownDollar: number
  maxDrawdownPct: number
}

export function EquityDrawdownChart({
  equityCurve,
  maxDrawdownDollar,
  maxDrawdownPct
}: EquityDrawdownChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!equityCurve || equityCurve.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
        <p className="text-xs text-muted-foreground">Belum ada histori trade tertutup pada periode ini untuk membentuk Equity Curve.</p>
      </div>
    )
  }

  // Calculate SVG bounds for Equity Curve
  const pnlValues = equityCurve.map((p) => p.cumulativePnl)
  const minPnl = Math.min(0, ...pnlValues)
  const maxPnl = Math.max(10, ...pnlValues)
  const pnlRange = maxPnl - minPnl || 1

  const width = 600
  const height = 180

  const points = equityCurve.map((p, i) => {
    const x = (i / (equityCurve.length - 1 || 1)) * (width - 40) + 20
    const y = height - 20 - ((p.cumulativePnl - minPnl) / pnlRange) * (height - 40)
    return { x, y, data: p }
  })

  const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`

  // Drawdown points
  const ddValues = equityCurve.map((p) => p.drawdownDollar)
  const maxDdVal = Math.max(10, ...ddValues)
  const ddPoints = equityCurve.map((p, i) => {
    const x = (i / (equityCurve.length - 1 || 1)) * (width - 40) + 20
    const y = ((p.drawdownDollar / maxDdVal) * (100 - 20)) + 10
    return { x, y, data: p }
  })
  const ddPathD = ddPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
  const ddAreaD = `M ${ddPoints[0].x} 10 ${ddPathD} L ${ddPoints[ddPoints.length - 1].x} 10 Z`

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : points[points.length - 1]

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-6">
      {/* 1. Equity Curve Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Equity Curve (Pertumbuhan Saldo Kumulatif)</span>
            </h3>
            <StatTooltip
              title="Equity Curve"
              definition="Grafik saldo kumulatif dari waktu ke waktu, menunjukkan tren pertumbuhan modal Anda."
              interpretation="Tren yang naik secara konsisten menandakan strategi menguntungkan secara stabil. Fluktuasi tajam menandakan volatilitas risiko yang tinggi."
              formula="Equity(t) = Modal Awal + Σ PnL(trade 1 ... trade t)"
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Pertumbuhan akumulasi PnL bersih berdasarkan urutan penutupan trade.
          </p>
        </div>

        {activePoint && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/50 px-3 py-1.5 rounded-xl font-mono text-xs text-right">
            <span className="text-[10px] text-muted-foreground font-sans block">{activePoint.data.date}</span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
              {activePoint.data.cumulativePnl >= 0 ? '+' : ''}${activePoint.data.cumulativePnl.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* SVG Equity Line Chart */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="20" y1={height / 2} x2={width - 20} y2={height / 2} stroke="currentColor" className="text-border/60" strokeDasharray="3 3" />

          {/* Area under curve */}
          <path d={areaD} fill="url(#equityGrad)" />

          {/* Curve line */}
          <path d={pathD} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive points */}
          {points.map((pt, idx) => (
            <circle
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === idx ? 6 : 3}
              className={cn(
                'transition-all cursor-pointer',
                hoveredIdx === idx ? 'fill-emerald-400 stroke-card stroke-2' : 'fill-emerald-600 dark:fill-emerald-400'
              )}
              onMouseEnter={() => setHoveredIdx(idx)}
            />
          ))}
        </svg>
      </div>

      {/* 2. Drawdown Section Header & Chart */}
      <div className="pt-4 border-t border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span>Analisis Drawdown (Penurunan dari Peak)</span>
              </h4>
              <StatTooltip
                title="Drawdown"
                definition="Penurunan saldo dari titik puncak tertinggi. Mengukur seberapa besar risiko/kerugian maksimal yang pernah dialami."
                interpretation="Drawdown rendah (< 15%) menandakan manajemen risiko yang terkontrol dengan baik. Drawdown tinggi (> 25%) berisiko merusak psikologi."
                formula="Drawdown ($) = Peak Equity Terbanyak - Saldo Terkini"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tingkat penurunan saldo maksimum dari puncak tertinggi selama periode.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-xl font-mono text-xs text-right">
              <span className="text-[10px] text-muted-foreground font-sans block font-medium">Max Drawdown ($)</span>
              <span className="font-extrabold text-red-700 dark:text-red-400">
                -${maxDrawdownDollar.toFixed(2)}
              </span>
            </div>

            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 px-3 py-1.5 rounded-xl font-mono text-xs text-right">
              <span className="text-[10px] text-muted-foreground font-sans block font-medium">Max Drawdown (%)</span>
              <span className="font-extrabold text-red-700 dark:text-red-400">
                -{maxDrawdownPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Drawdown Area SVG */}
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${width} 80`} className="w-full h-20 overflow-visible">
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#DC2626" stopOpacity="0.0" />
                <stop offset="100%" stopColor="#DC2626" stopOpacity="0.35" />
              </linearGradient>
            </defs>

            <path d={ddAreaD} fill="url(#ddGrad)" />
            <path d={ddPathD} fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}
