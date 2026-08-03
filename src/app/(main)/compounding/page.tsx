'use client'

import React from 'react'
import Link from 'next/link'
import { Calculator, Plus, TrendingUp, Target, ShieldCheck, ChevronRight, Crown } from 'lucide-react'

const dummyPlans = [
  {
    id: 'plan-1',
    name: 'Plan Akun Utama Forex (Risk 1.25%)',
    source: 'MT5 #4056802543 (Exness)',
    initialModal: 17031,
    currentLevel: 3,
    targetGoalLevel: 100,
    profitPlanPercent: 2.5,
    riskPlanPercent: 1.25,
    pipRisk: 50,
    pipValue: 10,
    status: 'active',
    lastAssetPlan: 18321
  }
]

export default function CompoundingListPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-6 w-6 text-amber-500" />
            <span>Kalkulator & Peta Jalan Compounding</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Position sizing terukur & proyeksi compounding pertumbuhan modal bertahap
          </p>
        </div>

        <Link
          href="/compounding/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer w-fit"
        >
          <Plus className="h-4 w-4" />
          <span>Buat Plan Baru</span>
        </Link>
      </div>

      {/* Plans List */}
      <div className="space-y-4">
        {dummyPlans.map((plan) => (
          <Link
            key={plan.id}
            href={`/compounding/${plan.id}`}
            className="block group bg-card border border-border hover:border-amber-500/50 rounded-2xl p-5 md:p-6 transition-all shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-foreground group-hover:text-amber-500 transition-colors">
                    {plan.name}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Aktif
                  </span>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>Sumber Modal:</span>
                  <span className="font-semibold text-foreground">{plan.source}</span>
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] text-muted-foreground block">Progres Level saat ini</span>
                  <span className="text-sm font-extrabold text-foreground">
                    Level {plan.currentLevel} <span className="text-muted-foreground text-xs font-normal">/ {plan.targetGoalLevel}</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Target Asset Level Ini</span>
                  <span className="text-sm font-extrabold text-emerald-500 font-mono">
                    ${plan.lastAssetPlan.toLocaleString()}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-muted/40 text-muted-foreground group-hover:text-amber-500 group-hover:bg-amber-500/10 transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">Modal Awal</span>
                <span className="font-bold font-mono text-foreground">${plan.initialModal.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Profit / Risk Plan</span>
                <span className="font-bold text-foreground">{plan.profitPlanPercent}% / {plan.riskPlanPercent}%</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Pip Risk</span>
                <span className="font-bold text-foreground">{plan.pipRisk} Pips</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Risk-Reward Ratio</span>
                <span className="font-extrabold text-amber-500">RR 1:2</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
