'use client'

import React, { useState } from 'react'
import {
  Lightbulb,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Brain,
  BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MfeCard } from '@/components/shared/mfe-card'
import { SqnCard } from '@/components/shared/sqn-card'

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'sqn_mfe' | 'pair' | 'strategy'>('overview')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" /> Analisis Performa &amp; Kualitas Sistem
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Evaluasi mendalam efisiensi exit (MFE), skor kualitas sistem (SQN), dan insights trading Anda.
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
            { id: 'overview',  label: 'Overview' },
            { id: 'sqn_mfe',   label: 'SQN & MFE Analytics' },
            { id: 'pair',      label: 'Pair / Simbol' },
            { id: 'strategy',  label: 'Strategi' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MFE & SQN Section (Level 3 - Detailed Analytics) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            <span>Kualitas Sistem (SQN) &amp; Efisiensi Exit (MFE)</span>
          </h2>
          <span className="text-[11px] text-muted-foreground">Evaluasi Statistik Lengkap</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MfeCard
            efficiencyPercent={74}
            excludedCount={0}
          />
          <SqnCard
            sqnScore={2.65}
            sampleCount={28}
          />
        </div>
      </div>

      {/* Analysis Key Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Win Rate', value: '68%', desc: '68 dari 100 trade menang', color: 'text-profit' },
          { label: 'Profit Factor', value: '1.85', desc: 'Gross Profit / Gross Loss', color: 'text-primary' },
          { label: 'Expectancy', value: '+$24.91 USD', desc: 'Ekspektasi PnL per trade', color: 'text-profit font-mono' },
          { label: 'Avg R:R (Reward:Risk)', value: '1 : 2.1', desc: 'Rata-rata rasio risk/reward', color: 'text-foreground font-mono' },
        ].map((item) => (
          <div key={item.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-muted-foreground block">{item.label}</span>
            <span className={cn('text-2xl font-extrabold block', item.color)}>{item.value}</span>
            <span className="text-[11px] text-muted-foreground block">{item.desc}</span>
          </div>
        ))}
      </div>

      {/* Equity Curve & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Grafik Kurva Ekuitas (Equity Curve)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Pertumbuhan saldo akun secara kumulatif</p>
            </div>
            <span className="text-xs font-bold text-profit bg-profit/15 px-2.5 py-1 rounded-full border border-profit/30">
              +18.4% All-Time
            </span>
          </div>

          <div className="h-64 flex flex-col justify-end p-4 bg-muted/10 border border-border/40 rounded-xl relative">
            <div className="flex-1 flex items-end gap-2 pt-6">
              {[120, 180, 150, 240, 310, 280, 390, 450, 420, 560, 680, 750].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-gradient-to-t from-primary/30 to-primary rounded-t-sm transition-all group-hover:brightness-125"
                    style={{ height: `${(val / 750) * 100}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground opacity-60 group-hover:opacity-100 font-mono">
                    T{i + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI & Rule-Based Insights */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="border-b border-border pb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <div>
              <h3 className="text-base font-bold text-foreground">Insights &amp; Rekomendasi</h3>
              <p className="text-xs text-muted-foreground">Evaluasi otomatis dari data trading Anda</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                icon: CheckCircle2,
                color: 'text-profit bg-profit/10 border-profit/30',
                title: 'Performa Positif',
                text: 'Performa tradingmu 14% lebih baik dibanding minggu lalu.',
              },
              {
                icon: AlertTriangle,
                color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
                title: 'Evaluasi Exit (MFE)',
                text: 'Efisiensi exit kamu 74%. Ada ruang optimasi Take Profit.',
              },
            ].map((insight, idx) => {
              const Icon = insight.icon
              return (
                <div key={idx} className={cn('p-3 rounded-xl border flex items-start gap-3 text-xs', insight.color)}>
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-foreground">{insight.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{insight.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
