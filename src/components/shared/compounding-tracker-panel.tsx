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
  Zap
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
      const effectiveStartModal = (currentBalance && currentBalance > 0) ? currentBalance : planParams.initialModal
      return calculateCompoundingLevels({
        ...planParams,
        initialModal: effectiveStartModal,
        totalLevels: 30,
      })
    } catch {
      return []
    }
  }, [planParams, currentBalance])

  const activeLevelInfo = useMemo(() => {
    if (levels.length === 0) return { activeIndex: 0, level: null, startModal: currentBalance, targetAsset: currentBalance * 1.025 }

    const currentLvl = levels[0]
    return {
      activeIndex: 0,
      level: currentLvl,
      startModal: currentBalance,
      targetAsset: currentLvl.assetPlan,
    }
  }, [levels, currentBalance])

  const nextLevelProgress = useMemo(() => {
    const { startModal, targetAsset } = activeLevelInfo
    const range = targetAsset - startModal
    if (range <= 0) return 0
    const progress = ((currentBalance - startModal) / range) * 100
    return Math.min(Math.max(progress, 0), 100)
  }, [currentBalance, activeLevelInfo])

  return (
    <div className={cn('flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm', className)}>
      {/* Header Panel */}
      <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
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
          className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline transition-all"
        >
          <span>Kelola</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Sticky Progress & Status Summary */}
      <div className="p-4 bg-card border-b border-border space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Zap className="h-3 w-3" /> Saldo Terkini &amp; Position Size
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono">
                Level 1
              </span>
              <span className="text-xs font-bold text-foreground font-mono">
                ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {activeLevelInfo.level && (
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block font-semibold">Ideal Lot ({planParams.riskPlanPercent}%)</span>
              <span className="text-xs font-mono font-extrabold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/40 px-2 py-0.5 rounded-lg inline-block">
                {activeLevelInfo.level.idealLot} Lot
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar to Target Next Level */}
        <div className="space-y-1.5 pt-1 border-t border-border/60">
          <div className="flex justify-between items-center text-[10px] font-semibold">
            <span className="text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Target Next Level:
            </span>
            <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
              ${activeLevelInfo.targetAsset.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({nextLevelProgress.toFixed(0)}%)
            </span>
          </div>

          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${nextLevelProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Level List / Table */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[500px] custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Memuat level compounding...</span>
          </div>
        ) : (
          levels.map((item, idx) => {
            const isActive = idx === 0
            const isAchieved = currentBalance >= item.assetPlan

            return (
              <div
                key={item.levelNumber}
                className={cn(
                  'p-2.5 rounded-xl border text-xs transition-all space-y-1.5',
                  isActive
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/60 shadow-sm'
                    : isAchieved
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30'
                    : 'bg-card border-border hover:bg-muted/40'
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
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      L{item.levelNumber}
                    </span>

                    {isActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                        Aktif
                      </span>
                    )}

                    {isAchieved && (
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                    )}
                  </div>

                  <div className="font-mono text-[11px] font-extrabold">
                    <span className="text-amber-800 dark:text-amber-400">{item.idealLot} Lot</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/50 text-[10px] font-mono">
                  <div>
                    <span className="text-[9px] text-muted-foreground block font-sans">Target</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">+${item.targetPlan}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block font-sans">Risk</span>
                    <span className="text-red-700 dark:text-red-400 font-semibold">-${item.riskAmount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block font-sans">Asset Target</span>
                    <span className="text-foreground font-bold">${item.assetPlan.toLocaleString('en-US', { maximumFractionDigits: 1 })}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Navigation CTA */}
      <div className="p-3 border-t border-border bg-muted/20 text-center">
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
