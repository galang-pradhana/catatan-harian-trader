'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Target,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { calculateCompoundingLevels, CompoundingLevelOutput } from '@/utils/compounding'
import { cn } from '@/lib/utils'

interface CompoundingPlanData {
  id: string
  name: string
  initial_modal: number
  profit_plan_percent: number
  risk_plan_percent: number
  pip_risk: number
  pip_value_per_lot: number
  status: string
}

interface CompoundingTrackerPanelProps {
  currentBalance?: number
  className?: string
}

export function CompoundingTrackerPanel({ currentBalance = 1000, className }: CompoundingTrackerPanelProps) {
  const { data: plansData, isLoading } = useQuery({
    queryKey: ['compounding-plans'],
    queryFn: async () => {
      const res = await fetch('/api/compounding')
      if (!res.ok) return []
      const json = await res.json()
      return json.plans as CompoundingPlanData[]
    },
    staleTime: 60_000,
  })

  const activePlan = useMemo(() => {
    if (!plansData || plansData.length === 0) return null
    return plansData.find((p) => p.status === 'active') || plansData[0]
  }, [plansData])

  // Fallback defaults if user hasn't created a plan yet
  const planParams = useMemo(() => {
    if (activePlan) {
      return {
        initialModal: Number(activePlan.initial_modal) || 1000,
        profitPlanPercent: Number(activePlan.profit_plan_percent) || 2.5,
        riskPlanPercent: Number(activePlan.risk_plan_percent) || 1.25,
        pipRisk: Number(activePlan.pip_risk) || 50,
        pipValuePerLot: Number(activePlan.pip_value_per_lot) || 10,
      }
    }
    return {
      initialModal: 1000,
      profitPlanPercent: 2.5,
      riskPlanPercent: 1.25,
      pipRisk: 50,
      pipValuePerLot: 10,
    }
  }, [activePlan])

  const levels: CompoundingLevelOutput[] = useMemo(() => {
    try {
      return calculateCompoundingLevels({
        ...planParams,
        totalLevels: 30,
      })
    } catch {
      return []
    }
  }, [planParams])

  // Find active level based on current balance
  const activeLevelInfo = useMemo(() => {
    if (levels.length === 0) return { activeIndex: 0, level: null, startModal: planParams.initialModal, targetAsset: planParams.initialModal * 1.025 }

    let activeIdx = 0
    let startModal = planParams.initialModal

    for (let i = 0; i < levels.length; i++) {
      const lvl = levels[i]
      const prevAsset = i === 0 ? planParams.initialModal : levels[i - 1].assetPlan
      if (currentBalance < lvl.assetPlan) {
        activeIdx = i
        startModal = prevAsset
        break
      }
      activeIdx = i
      startModal = lvl.assetPlan
    }

    const currentLvl = levels[activeIdx] || levels[0]
    return {
      activeIndex: activeIdx,
      level: currentLvl,
      startModal,
      targetAsset: currentLvl.assetPlan,
    }
  }, [levels, currentBalance, planParams.initialModal])

  // Calculate progress % towards next level target
  const nextLevelProgress = useMemo(() => {
    const { startModal, targetAsset } = activeLevelInfo
    const range = targetAsset - startModal
    if (range <= 0) return 0
    const progress = ((currentBalance - startModal) / range) * 100
    return Math.min(Math.max(progress, 0), 100)
  }, [currentBalance, activeLevelInfo])

  return (
    <div className={cn('flex flex-col h-full bg-card/80 border border-border/80 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm', className)}>
      {/* Header Panel */}
      <div className="p-4 border-b border-border/80 bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-extrabold text-foreground tracking-tight">
              Compounding Tracker
            </h2>
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              {activePlan ? activePlan.name : 'Default Plan (2.5% Target)'}
            </p>
          </div>
        </div>

        <Link
          href={activePlan ? `/compounding/${activePlan.id}` : '/compounding'}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline transition-all"
        >
          <span>Kelola</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Sticky Progress & Status Summary */}
      <div className="p-4 bg-card border-b border-border/60 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
              Level Aktif Saat Ini
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-amber-400 font-mono">
                Level {activeLevelInfo.level ? activeLevelInfo.level.levelNumber : 1}
              </span>
              <span className="text-xs font-bold text-foreground font-mono">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {activeLevelInfo.level && (
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Ideal Lot</span>
              <span className="text-xs font-mono font-extrabold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg inline-block">
                {activeLevelInfo.level.idealLot} Lot
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar to Target Next Level */}
        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex justify-between items-center text-[10px] font-semibold">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3 text-emerald-400" /> Target Next Level:
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              ${activeLevelInfo.targetAsset.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({nextLevelProgress.toFixed(0)}%)
            </span>
          </div>

          <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/40">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${nextLevelProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Level List / Table */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[500px] custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            <span>Memuat level compounding...</span>
          </div>
        ) : (
          levels.map((item, idx) => {
            const isActive = idx === activeLevelInfo.activeIndex
            const isAchieved = currentBalance >= item.assetPlan

            return (
              <div
                key={item.levelNumber}
                className={cn(
                  'p-2.5 rounded-xl border text-xs transition-all space-y-1.5',
                  isActive
                    ? 'bg-amber-500/15 border-amber-500/70 shadow-sm shadow-amber-500/10'
                    : isAchieved
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-muted-foreground'
                    : 'bg-card/60 border-border/50 hover:bg-muted/20'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-md',
                        isActive
                          ? 'bg-amber-500 text-black'
                          : isAchieved
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      L{item.levelNumber}
                    </span>

                    {isActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        Aktif
                      </span>
                    )}

                    {isAchieved && (
                      <span className="text-[9px] font-bold text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-[11px] font-extrabold">
                    <span className="text-amber-400">{item.idealLot} Lot</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/40 text-[10px] font-mono">
                  <div>
                    <span className="text-[9px] text-muted-foreground block font-sans">Target</span>
                    <span className="text-emerald-400 font-semibold">+${item.targetPlan}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block font-sans">Risk</span>
                    <span className="text-destructive font-semibold">-${item.riskAmount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block font-sans">Asset Target</span>
                    <span className="text-foreground font-bold">${item.assetPlan.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Navigation CTA */}
      <div className="p-3 border-t border-border/80 bg-muted/20 text-center">
        <Link
          href="/compounding"
          className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <span>Kelola di Menu Compounding</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
