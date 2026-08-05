'use client'

import React, { useRef } from 'react'
import { CheckCircle2, ChevronRight, ChevronLeft, Sparkles, Flag, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RoadmapLevelNode {
  level: number
  targetPlan: number
  assetPlan: number
  idealLot: number
  riskAmount: number
  isAchieved: boolean
  manualOverride?: boolean
  achievedAt?: string | null
}

interface CompoundingRoadmapProps {
  levels: RoadmapLevelNode[]
  currentActiveLevel: number
  onSelectLevel?: (levelNumber: number) => void
  selectedLevel?: number | null
}

export function CompoundingRoadmap({
  levels,
  currentActiveLevel,
  onSelectLevel,
  selectedLevel
}: CompoundingRoadmapProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Display top 30-50 levels for stepper
  const displayLevels = levels.slice(0, 50)

  return (
    <div className="bg-card/90 border border-border/80 rounded-3xl p-5 md:p-6 shadow-sm backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground tracking-tight flex items-center gap-2">
              <span>Peta Jalan Level Compounding</span>
              <span className="text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                Level {currentActiveLevel} Aktif
              </span>
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Peta tahapan pencapaian level modal. Klik node level untuk melihat rincian.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="p-2 rounded-xl bg-secondary border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Scroll Kiri"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="p-2 rounded-xl bg-secondary border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            title="Scroll Kanan"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* HORIZONTAL ROADMAP NODES STEPPER */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-3 overflow-x-auto pb-4 pt-2 scrollbar-none custom-scrollbar select-none"
      >
        {displayLevels.map((item, idx) => {
          const isActive = item.level === currentActiveLevel
          const isAchieved = item.isAchieved
          const isSelected = selectedLevel === item.level

          return (
            <React.Fragment key={item.level}>
              {/* Stepper Node Item */}
              <div
                onClick={() => onSelectLevel?.(item.level)}
                className={cn(
                  'flex-shrink-0 w-[140px] p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between group hover:scale-[1.02]',
                  isActive
                    ? 'bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5 border-amber-500 shadow-md shadow-amber-500/15 ring-2 ring-amber-500/30'
                    : isAchieved
                    ? 'bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-400'
                    : 'bg-card/70 border-border/70 hover:bg-muted/30 hover:border-border',
                  isSelected && !isActive && 'ring-2 ring-primary'
                )}
              >
                {/* Top Badge */}
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span
                    className={cn(
                      'font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-lg',
                      isActive
                        ? 'bg-amber-500 text-black font-black'
                        : isAchieved
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    Level {item.level}
                  </span>

                  {isAchieved ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : isActive ? (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  )}
                </div>

                {/* Values */}
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">Target Asset</span>
                  <span
                    className={cn(
                      'font-mono text-xs font-black block',
                      isActive ? 'text-amber-400' : isAchieved ? 'text-emerald-400' : 'text-foreground'
                    )}
                  >
                    ${item.assetPlan.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground">Lot:</span>
                  <span className="font-bold text-amber-400">{item.idealLot} Lot</span>
                </div>
              </div>

              {/* Connecting Connector Line */}
              {idx < displayLevels.length - 1 && (
                <div
                  className={cn(
                    'flex-shrink-0 w-6 h-0.5 rounded-full transition-colors',
                    isAchieved ? 'bg-emerald-500/50' : isActive ? 'bg-amber-500/50' : 'bg-border/60'
                  )}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
