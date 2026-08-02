'use client'

import React, { useState } from 'react'
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Sparkles,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'pair' | 'strategy' | 'time' | 'direction'>('overview')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" /> Analisis Performa &amp; Insights
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Evaluasi otomatis berdasarkan data historis untuk menemukan edge dan area perbaikan trading Anda.
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
            { id: 'overview',  label: 'Overview' },
            { id: 'pair',      label: 'Pair' },
            { id: 'strategy',  label: 'Strategi' },
            { id: 'time',      label: 'Waktu / Sesi' },
            { id: 'direction', label: 'Long vs Short' },
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

      {/* Main Grid: Equity Curve & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Equity Curve Chart (2/3 width) */}
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

          <div className="h-72 flex flex-col justify-end p-4 bg-muted/10 border border-border/40 rounded-xl relative">
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

        {/* Right: AI & Rule-Based Insights (1/3 width) */}
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
                icon: CheckCircle2,
                color: 'text-primary bg-primary/10 border-primary/30',
                title: 'Pair Terbaik',
                text: 'Pair EURUSD memberikan kontribusi profit terbesar (40% total PnL).',
              },
              {
                icon: AlertTriangle,
                color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
                title: 'Evaluasi Sesi Waktu',
                text: 'Win rate di sesi New York relatif lebih rendah (45%). Hindari overtrade di sesi ini.',
              },
              {
                icon: CheckCircle2,
                color: 'text-profit bg-profit/10 border-profit/30',
                title: 'Manajemen Risiko',
                text: 'Manajemen risiko sudah baik (R:R 1:2.1). Pertahankan kedisiplinan stop loss.',
              },
            ].map((insight, idx) => {
              const Icon = insight.icon
              return (
                <div key={idx} className={cn('p-3.5 rounded-xl border flex items-start gap-3', insight.color)}>
                  <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{insight.title}</h4>
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
