'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Lock,
  ChevronDown,
  TrendingUp,
  ShieldCheck,
  Target,
  Sliders,
  DollarSign
} from 'lucide-react'

interface LevelRow {
  level: number
  targetPlan: number
  assetPlan: number
  idealLot: number
  riskAmount: number
  isAchieved: boolean
}

// Generate sample level data using the exact formula from PRD Section 0
function generateLevels(initialModal: number, profitPct: number, riskPct: number, pipRisk: number, pipValue: number, total: number = 100): LevelRow[] {
  const levels: LevelRow[] = []
  let currentBalance = initialModal

  for (let i = 1; i <= total; i++) {
    // Target = FLOOR(Balance * Profit%, 10)
    const rawTarget = currentBalance * (profitPct / 100)
    const targetPlan = Math.floor(rawTarget / 10) * 10

    // Risk = FLOOR(Balance * Risk%, 5)
    const rawRisk = currentBalance * (riskPct / 100)
    const riskAmount = Math.floor(rawRisk / 5) * 5

    // Ideal Lot = Risk / (Pip Risk * Pip Value)
    const idealLot = parseFloat((riskAmount / (pipRisk * pipValue)).toFixed(2))

    // Asset Plan = Balance + Target Plan
    const assetPlan = currentBalance + targetPlan

    levels.push({
      level: i,
      targetPlan,
      assetPlan,
      idealLot,
      riskAmount,
      isAchieved: i <= 2 // Levels 1 & 2 achieved in dummy state
    })

    currentBalance = assetPlan
  }
  return levels
}

export default function CompoundingDetailPage() {
  const params = useParams()
  const planId = params.id as string

  const planInfo = {
    id: planId,
    name: 'Plan Akun Utama Forex (Risk 1.25%)',
    source: 'MT5 #4056802543 (Exness)',
    initialModal: 17031,
    profitPlanPercent: 2.5,
    riskPlanPercent: 1.25,
    pipRisk: 50,
    pipValue: 10,
    currentActiveLevel: 3,
  }

  const [levels] = useState<LevelRow[]>(() =>
    generateLevels(
      planInfo.initialModal,
      planInfo.profitPlanPercent,
      planInfo.riskPlanPercent,
      planInfo.pipRisk,
      planInfo.pipValue,
      100
    )
  )

  const activeLevelItem = levels.find((l) => l.level === planInfo.currentActiveLevel) || levels[0]

  return (
    <div className="space-y-6 pb-12">
      {/* Back Button & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/compounding"
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">{planInfo.name}</h1>
          <p className="text-xs text-muted-foreground">{planInfo.source}</p>
        </div>
      </div>

      {/* Sticky Summary Progress Bar */}
      <div className="sticky top-16 z-20 bg-card/95 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-extrabold text-sm">
            L{planInfo.currentActiveLevel}
          </div>
          <div>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
              Level Aktif Saat Ini
            </span>
            <span className="text-xs font-bold text-foreground">
              Rekomendasi Lot: <span className="text-amber-400 font-mono text-sm">{activeLevelItem.idealLot} Lot</span>
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-muted-foreground block">Target Asset Level Ini</span>
          <span className="text-sm font-extrabold text-emerald-500 font-mono">
            ${activeLevelItem.assetPlan.toLocaleString()}
          </span>
        </div>
      </div>

      {/* MOBILE VIEW: Stacked Cards (Viewport < 768px) */}
      <div className="block md:hidden space-y-3">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Peta Jalan Level Compounding (Card Stack View)
        </h2>

        {levels.slice(0, 30).map((item) => {
          const isActive = item.level === planInfo.currentActiveLevel
          return (
            <div
              key={item.level}
              className={`p-4 rounded-2xl border transition-all space-y-3 ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500 shadow-md shadow-amber-500/10'
                  : item.isAchieved
                  ? 'bg-card/60 border-emerald-500/30'
                  : 'bg-card border-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                      isActive
                        ? 'bg-amber-500 text-black'
                        : item.isAchieved
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Level {item.level}
                  </span>
                  {isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      Aktif
                    </span>
                  )}
                  {item.isAchieved && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Tercapai
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground block">Ideal Lot</span>
                  <span className="font-mono text-xs font-extrabold text-amber-400">
                    {item.idealLot} Lot
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Target Plan</span>
                  <span className="font-mono font-semibold text-emerald-500">
                    +${item.targetPlan}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block">Batasan Risk</span>
                  <span className="font-mono font-semibold text-destructive">
                    -${item.riskAmount}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground block">Asset Plan</span>
                  <span className="font-mono font-bold text-foreground">
                    ${item.assetPlan.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* DESKTOP VIEW: Data Table (Viewport >= 768px) */}
      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
            <tr>
              <th className="py-3.5 px-4">Level</th>
              <th className="py-3.5 px-4">Target Plan (+2.5%)</th>
              <th className="py-3.5 px-4">Risk Amount (-1.25%)</th>
              <th className="py-3.5 px-4">Ideal Position Size</th>
              <th className="py-3.5 px-4">Asset Plan (Running Balance)</th>
              <th className="py-3.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {levels.slice(0, 50).map((item) => {
              const isActive = item.level === planInfo.currentActiveLevel
              return (
                <tr
                  key={item.level}
                  className={`transition-colors ${
                    isActive
                      ? 'bg-amber-500/10 font-bold border-l-4 border-l-amber-500'
                      : 'hover:bg-muted/20'
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold">
                    Level {item.level}
                  </td>
                  <td className="py-3 px-4 text-emerald-500 font-mono">
                    +${item.targetPlan}
                  </td>
                  <td className="py-3 px-4 text-destructive font-mono">
                    -${item.riskAmount}
                  </td>
                  <td className="py-3 px-4 text-amber-400 font-mono font-bold">
                    {item.idealLot} Lot
                  </td>
                  <td className="py-3 px-4 font-mono text-foreground font-bold">
                    ${item.assetPlan.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {item.isAchieved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Tercapai
                      </span>
                    ) : isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Aktif
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">Belum</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
