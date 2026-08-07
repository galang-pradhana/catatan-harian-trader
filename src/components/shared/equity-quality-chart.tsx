'use client'

import React, { useState } from 'react'
import { TrendingUp, Activity } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

export interface EquityPoint {
  date: string
  cumulativePnl: number
  drawdownDollar: number
  drawdownPct: number
}

export interface PeriodicTrendPoint {
  label: string
  sqn?: number
  expectancy?: number
  tradeCount: number
  isSmallSample?: boolean
}

interface EquityQualityChartProps {
  equityCurve: EquityPoint[]
  sqnTrend: PeriodicTrendPoint[]
  expectancyTrend: PeriodicTrendPoint[]
}

type OverlayMode = 'sqn' | 'expectancy'

const SQN_ZONES = [
  { min: 3.0, max: Infinity, color: '#D4A94C', label: 'Sangat Baik' },
  { min: 2.0, max: 3.0,     color: '#22c55e', label: 'Baik' },
  { min: 1.0, max: 2.0,     color: '#f59e0b', label: 'Rata-Rata' },
  { min: -Infinity, max: 1.0, color: '#ef4444', label: 'Kurang' },
]

function getSqnColor(sqn: number): string {
  for (const zone of SQN_ZONES) {
    if (sqn >= zone.min && sqn < zone.max) return zone.color
  }
  return '#ef4444'
}

export function EquityQualityChart({ equityCurve, sqnTrend, expectancyTrend }: EquityQualityChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [overlay, setOverlay] = useState<OverlayMode>('sqn')

  const trendData = overlay === 'sqn' ? sqnTrend : expectancyTrend
  const overlayValues = trendData.map(d => overlay === 'sqn' ? (d.sqn ?? 0) : (d.expectancy ?? 0))

  const W = 600; const H = 180

  // Equity curve SVG
  const pnlValues = equityCurve.map(p => p.cumulativePnl)
  const minPnl = Math.min(0, ...pnlValues)
  const maxPnl = Math.max(10, ...pnlValues)
  const pnlRange = maxPnl - minPnl || 1

  const equityPoints = equityCurve.map((p, i) => ({
    x: (i / (equityCurve.length - 1 || 1)) * (W - 40) + 20,
    y: H - 20 - ((p.cumulativePnl - minPnl) / pnlRange) * (H - 40),
    data: p,
  }))
  const pathD = equityPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
  const areaD = `${pathD} L ${equityPoints[equityPoints.length - 1]?.x ?? W} ${H - 10} L ${equityPoints[0]?.x ?? 20} ${H - 10} Z`

  // Overlay SVG (SQN or Expectancy)
  const minOverlay = Math.min(...overlayValues)
  const maxOverlay = Math.max(...overlayValues, 0.1)
  const overlayRange = maxOverlay - minOverlay || 1

  const overlayPoints = trendData.map((d, i) => ({
    x: trendData.length > 1 ? (i / (trendData.length - 1)) * (W - 40) + 20 : W / 2,
    y: H - 20 - (((overlay === 'sqn' ? (d.sqn ?? 0) : (d.expectancy ?? 0)) - minOverlay) / overlayRange) * (H - 40),
    data: d,
  }))
  const overlayPath = overlayPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')

  const activeEquityPoint = hoveredIdx !== null ? equityPoints[hoveredIdx] : equityPoints[equityPoints.length - 1]
  const hasData = equityCurve.length > 0
  const hasTrend = trendData.length > 0

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Equity Curve + Tren Kualitas Sistem</span>
            </h3>
            <StatTooltip
              title="Equity Curve + Tren Kualitas"
              definition="Grafik saldo kumulatif (hijau) dioverlay dengan tren kualitas sistem per periode. Memperlihatkan apakah kualitas sistem membaik atau memburuk seiring waktu."
              interpretation="Equity yang naik bersama SQN yang meningkat = sistem semakin valid. Equity naik tapi SQN turun = profit mungkin karena keberuntungan, bukan edge yang solid."
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Overlay equity dengan rolling SQN/Expectancy per periode
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Overlay Toggle */}
          <div className="flex items-center gap-1 bg-muted/40 border border-border rounded-xl p-1 text-xs">
            {([
              { id: 'sqn', label: 'Rolling SQN' },
              { id: 'expectancy', label: 'Rolling Expectancy' },
            ] as { id: OverlayMode; label: string }[]).map(opt => (
              <button
                key={opt.id}
                onClick={() => setOverlay(opt.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer',
                  overlay === opt.id
                    ? 'bg-card text-foreground shadow-sm border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Current equity badge */}
          {activeEquityPoint && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-700/50 px-3 py-1.5 rounded-xl font-mono text-xs text-right">
              <span className="text-[10px] text-muted-foreground font-sans block">{activeEquityPoint.data.date}</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                {activeEquityPoint.data.cumulativePnl >= 0 ? '+' : ''}${activeEquityPoint.data.cumulativePnl.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
          Belum ada data trade tertutup untuk membentuk grafik.
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44 overflow-visible">
            <defs>
              <linearGradient id="eqGradQ" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A34A" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#16A34A" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Mid grid line */}
            <line x1="20" y1={H / 2} x2={W - 20} y2={H / 2} stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />

            {/* Equity area fill */}
            {equityPoints.length > 1 && <path d={areaD} fill="url(#eqGradQ)" />}

            {/* Equity line */}
            {equityPoints.length > 1 && (
              <path d={pathD} fill="none" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Overlay trend line */}
            {hasTrend && overlayPoints.length > 1 && (
              <>
                {overlayPoints.map((pt, i) => {
                  if (i === 0) return null
                  const prev = overlayPoints[i - 1]
                  const val = overlay === 'sqn' ? (trendData[i].sqn ?? 0) : (trendData[i].expectancy ?? 0)
                  const color = overlay === 'sqn' ? getSqnColor(val) : (val >= 0 ? '#22c55e' : '#ef4444')
                  return (
                    <line
                      key={i}
                      x1={prev.x} y1={prev.y} x2={pt.x} y2={pt.y}
                      stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="5 3"
                    />
                  )
                })}

                {/* Overlay dots with labels */}
                {overlayPoints.map((pt, i) => {
                  const d = trendData[i]
                  const val = overlay === 'sqn' ? (d.sqn ?? 0) : (d.expectancy ?? 0)
                  const color = overlay === 'sqn' ? getSqnColor(val) : (val >= 0 ? '#22c55e' : '#ef4444')
                  return (
                    <g key={i}>
                      <circle cx={pt.x} cy={pt.y} r={5} fill={color} stroke="white" strokeWidth="1.5" />
                      <text x={pt.x} y={pt.y - 10} textAnchor="middle" fontSize="8" fill={color} fontWeight="bold">
                        {overlay === 'sqn' ? val.toFixed(1) : `$${val.toFixed(0)}`}
                      </text>
                    </g>
                  )
                })}
              </>
            )}

            {/* Interactive equity hover dots */}
            {equityPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x} cy={pt.y}
                r={hoveredIdx === idx ? 6 : 3}
                className={cn('transition-all cursor-pointer', hoveredIdx === idx ? 'fill-emerald-400 stroke-card stroke-2' : 'fill-emerald-600 dark:fill-emerald-400 opacity-70')}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground border-t border-border/50 pt-2">
        <span className="flex items-center gap-1.5"><span className="h-2 w-6 rounded-full bg-emerald-500 inline-block" /> Equity Curve</span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-6 border-t-2 border-dashed border-amber-400 inline-block" />
          {overlay === 'sqn' ? 'SQN per Periode' : 'Expectancy per Periode'}
        </span>
        {overlay === 'sqn' && (
          <span className="flex items-center gap-2 ml-auto">
            {SQN_ZONES.slice(0, 3).map(z => (
              <span key={z.label} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full inline-block" style={{ background: z.color }} />
                <span>{z.label}</span>
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  )
}
