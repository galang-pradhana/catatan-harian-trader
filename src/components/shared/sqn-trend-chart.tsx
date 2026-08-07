'use client'

import React from 'react'
import { Award, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { StatTooltip } from '@/components/shared/stat-tooltip'
import { cn } from '@/lib/utils'

export interface SqnTrendPoint {
  label: string
  sqn: number
  tradeCount: number
  isSmallSample: boolean
}

interface SqnTrendChartProps {
  data: SqnTrendPoint[]
  isSmallSample?: boolean
}

interface ZoneBand {
  min: number; max: number; color: string; fillColor: string; label: string
}

const ZONES: ZoneBand[] = [
  { min: 3.0, max: 6.0,   color: '#D4A94C', fillColor: 'rgba(212,169,76,0.12)',  label: 'Sangat Baik (>3.0)' },
  { min: 2.0, max: 3.0,   color: '#22c55e', fillColor: 'rgba(34,197,94,0.10)',   label: 'Baik (2.0–3.0)' },
  { min: 1.0, max: 2.0,   color: '#f59e0b', fillColor: 'rgba(245,158,11,0.10)',  label: 'Rata-Rata (1.0–2.0)' },
  { min: -1.0, max: 1.0,  color: '#ef4444', fillColor: 'rgba(239,68,68,0.10)',   label: 'Kurang (<1.0)' },
]

function getSqnColor(sqn: number): string {
  if (sqn >= 3.0) return '#D4A94C'
  if (sqn >= 2.0) return '#22c55e'
  if (sqn >= 1.0) return '#f59e0b'
  return '#ef4444'
}

export function SqnTrendChart({ data, isSmallSample }: SqnTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span>Tren SQN per Periode</span>
          </h3>
          <StatTooltip
            title="Rolling SQN Trend"
            definition="Skor SQN dihitung per periode (minggu/bulan) untuk melihat apakah kualitas sistem trading Anda membaik atau memburuk seiring waktu."
            interpretation="Tren SQN naik = sistem semakin konsisten. Tren turun = kualitas edge menurun, perlu evaluasi. Zona warna: merah <1.0, kuning 1.0–2.0, hijau 2.0–3.0, emas >3.0."
          />
        </div>
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
          Belum cukup data dengan actual R:R untuk menghitung SQN periodik.
        </div>
      </div>
    )
  }

  const W = 560; const H = 160
  const PAD = { top: 16, right: 20, bottom: 24, left: 32 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const allSqn = data.map(d => d.sqn)
  const minVal = Math.min(-0.5, ...allSqn)
  const maxVal = Math.max(3.5, ...allSqn)
  const valRange = maxVal - minVal || 1

  const toY = (v: number) => PAD.top + innerH - ((v - minVal) / valRange) * innerH
  const toX = (i: number) => PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2)

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.sqn), data: d }))
  const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')

  // Build zone rectangles (clipped to chart area)
  const zoneRects = ZONES.map(zone => {
    const y1 = Math.max(PAD.top, toY(Math.min(zone.max, maxVal)))
    const y2 = Math.min(PAD.top + innerH, toY(Math.max(zone.min, minVal)))
    return { ...zone, y1, y2, height: y2 - y1 }
  }).filter(z => z.height > 0)

  // Threshold lines at 1.0, 2.0, 3.0
  const thresholds = [1.0, 2.0, 3.0].filter(v => v >= minVal && v <= maxVal)

  // Trend direction
  const first = data[0]?.sqn ?? 0
  const last = data[data.length - 1]?.sqn ?? 0
  const trending = last > first + 0.2 ? 'up' : last < first - 0.2 ? 'down' : 'flat'

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <span>Tren SQN per Periode</span>
          </h3>
          <StatTooltip
            title="Rolling SQN Trend"
            definition="Skor SQN dihitung per periode (minggu/bulan) untuk melihat apakah kualitas sistem trading Anda membaik atau memburuk seiring waktu."
            interpretation="Tren SQN naik = sistem semakin konsisten. Tren turun = kualitas edge menurun, perlu evaluasi. Zona warna: merah <1.0, kuning 1.0–2.0, hijau 2.0–3.0, emas >3.0."
          />
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border', trending === 'up' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/50' : trending === 'down' ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700/50' : 'text-muted-foreground bg-muted/40 border-border')}>
          {trending === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : trending === 'down' ? <TrendingDown className="h-3.5 w-3.5" /> : null}
          {trending === 'up' ? 'Membaik' : trending === 'down' ? 'Menurun' : 'Stabil'}
        </div>
      </div>

      {/* Chart */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40 overflow-visible">
          {/* Zone bands */}
          {zoneRects.map((z, i) => (
            <rect key={i} x={PAD.left} y={z.y1} width={innerW} height={z.height} fill={z.fillColor} />
          ))}

          {/* Threshold lines */}
          {thresholds.map(v => (
            <line
              key={v}
              x1={PAD.left} y1={toY(v)} x2={PAD.left + innerW} y2={toY(v)}
              stroke={v === 1.0 ? '#ef4444' : v === 2.0 ? '#22c55e' : '#D4A94C'}
              strokeWidth="1" strokeDasharray="4 3" opacity="0.5"
            />
          ))}
          {thresholds.map(v => (
            <text key={`lbl-${v}`} x={PAD.left - 4} y={toY(v) + 3} textAnchor="end" fontSize="8" fill="currentColor" opacity="0.6" className="text-muted-foreground">
              {v.toFixed(0)}
            </text>
          ))}

          {/* Area under SQN line */}
          {points.length > 1 && (
            <path
              d={`${pathD} L ${points[points.length - 1].x} ${PAD.top + innerH} L ${points[0].x} ${PAD.top + innerH} Z`}
              fill={getSqnColor(last)} fillOpacity="0.08"
            />
          )}

          {/* SQN line */}
          {points.length > 1 && (
            <path d={pathD} fill="none" stroke={getSqnColor(last)} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Dots */}
          {points.map((pt, i) => (
            <circle
              key={i} cx={pt.x} cy={pt.y} r={5}
              fill={getSqnColor(pt.data.sqn)} stroke="white" strokeWidth="1.5"
            />
          ))}

          {/* X-axis labels */}
          {points.map((pt, i) => (
            <text key={`xl-${i}`} x={pt.x} y={H - 4} textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.6" className="text-muted-foreground">
              {pt.data.label}
            </text>
          ))}
        </svg>
      </div>

      {/* Small sample warning */}
      {(isSmallSample || data.some(d => d.isSmallSample)) && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl flex items-center gap-2 text-[10px] text-amber-500 font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Beberapa periode memiliki sampel sedikit (&lt;10 trade). SQN bersifat tentatif secara statistik.</span>
        </div>
      )}

      {/* Zone Legend */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-muted-foreground border-t border-border/50 pt-2">
        {ZONES.map(z => (
          <span key={z.label} className="flex items-center gap-1">
            <span className="h-2 w-3 rounded inline-block" style={{ background: z.fillColor, border: `1px solid ${z.color}` }} />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  )
}
