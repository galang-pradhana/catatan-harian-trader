'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calculator,
  Sliders,
  DollarSign,
  Percent,
  TrendingUp,
  ShieldAlert,
  Link2,
  CheckCircle2
} from 'lucide-react'

export default function CreateCompoundingPlanPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [modalSource, setModalSource] = useState<'mt5' | 'manual'>('mt5')
  const [selectedMt5Id, setSelectedMt5Id] = useState('mt5-1')
  const [manualModal, setManualModal] = useState('17031')
  const [profitPlanPercent, setProfitPlanPercent] = useState('2.5')
  const [riskPlanPercent, setRiskPlanPercent] = useState('1.25')
  const [pipRisk, setPipRisk] = useState('50')
  const [pipValue, setPipValue] = useState('10')
  const [goalLevelTarget, setGoalLevelTarget] = useState('100')

  // Calculate live RR preview
  const profitNum = parseFloat(profitPlanPercent) || 0
  const riskNum = parseFloat(riskPlanPercent) || 0
  const rrRatio = riskNum > 0 ? (profitNum / riskNum).toFixed(1) : '0'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Redirect to compounding plan detail view
    router.push('/compounding/plan-1')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/compounding"
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Buat Plan Compounding Baru</h1>
          <p className="text-xs text-muted-foreground">
            Atur target profit, batasan risiko, dan jarak SL per trade secara terukur
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info & Modal Source Card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
          <div>
            <label className="block text-xs font-bold text-foreground mb-1.5">
              Nama Plan Compounding
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Plan Akun Utama Exness 2.5%"
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground mb-2">
              Sumber Modal Awal
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModalSource('mt5')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  modalSource === 'mt5'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground font-bold'
                    : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Link2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs block">Otomatis dari MT5</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Tarik saldo real saat ini
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModalSource('manual')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  modalSource === 'manual'
                    ? 'border-amber-500 bg-amber-500/10 text-foreground font-bold'
                    : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted'
                }`}
              >
                <DollarSign className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs block">Input Manual (Simulasi)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Mode uji coba angka modal
                  </span>
                </div>
              </button>
            </div>
          </div>

          {modalSource === 'mt5' ? (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Pilih Akun MT5 Terhubung
              </label>
              <select
                value={selectedMt5Id}
                onChange={(e) => setSelectedMt5Id(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500"
              >
                <option value="mt5-1">Exness-Real7 (#4056802543) - Balance $17,031.00</option>
                <option value="mt5-2">ICMarkets-Live (#10928374) - Balance $5,420.00</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Modal Awal ($ USD)
              </label>
              <input
                type="number"
                step="any"
                value={manualModal}
                onChange={(e) => setManualModal(e.target.value)}
                placeholder="17031"
                className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Calculation Parameters Card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sliders className="h-4 w-4 text-amber-500" />
            <span>Parameter Risiko & Target per Level</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Target Profit Plan (%)
                </label>
                <span className="text-xs font-bold text-emerald-500">{profitPlanPercent}%</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={profitPlanPercent}
                onChange={(e) => setProfitPlanPercent(e.target.value)}
                className="w-full px-4 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Risk Plan per Level (%)
                </label>
                <span className="text-xs font-bold text-destructive">{riskPlanPercent}%</span>
              </div>
              <input
                type="number"
                step="0.05"
                value={riskPlanPercent}
                onChange={(e) => setRiskPlanPercent(e.target.value)}
                className="w-full px-4 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Pip Risk (Jarak Stop Loss dalam Pips)
              </label>
              <input
                type="number"
                value={pipRisk}
                onChange={(e) => setPipRisk(e.target.value)}
                className="w-full px-4 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Nilai $ per Pip per Lot Standar ($)
              </label>
              <input
                type="number"
                value={pipValue}
                onChange={(e) => setPipValue(e.target.value)}
                placeholder="10"
                className="w-full px-4 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Default: $10 untuk mayoritas pair forex quote USD (contoh: EURUSD, XAUUSD)
              </span>
            </div>
          </div>

          {/* Live Risk Reward Ratio Preview */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-amber-400 block">Preview Ratio Risk:Reward</span>
              <span className="text-[11px] text-muted-foreground">
                Target {profitPlanPercent}% ÷ Risk {riskPlanPercent}%
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-amber-400 font-mono">
                RR 1:{rrRatio}
              </span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Simpan & Generate Compounding Table</span>
        </button>
      </form>
    </div>
  )
}
