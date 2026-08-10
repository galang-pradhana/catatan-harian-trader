'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Calculator,
  Sliders,
  DollarSign,
  Percent,
  TrendingUp,
  ShieldAlert,
  Link2,
  CheckCircle2,
  Loader2,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CreateCompoundingPlanPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [modalSource, setModalSource] = useState<'mt5' | 'manual'>('mt5')
  const [selectedMt5Id, setSelectedMt5Id] = useState('')
  const [manualModal, setManualModal] = useState('1000')
  const [profitPlanPercent, setProfitPlanPercent] = useState('2.5')
  const [riskPlanPercent, setRiskPlanPercent] = useState('1.25')
  const [pipRisk, setPipRisk] = useState('50')
  const [pipValue, setPipValue] = useState('10')
  const [goalLevelTarget, setGoalLevelTarget] = useState('100')
  const [rulesNotes, setRulesNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch MT5 connections
  const { data: mt5Data, isLoading: isLoadingMt5 } = useQuery({
    queryKey: ['mt5-connections-create'],
    queryFn: async () => {
      const res = await fetch('/api/mt5/connections')
      if (!res.ok) return []
      const json = await res.json()
      return json.connections || []
    },
  })

  // Calculate live RR preview
  const profitNum = parseFloat(profitPlanPercent) || 0
  const riskNum = parseFloat(riskPlanPercent) || 0
  const rrRatio = riskNum > 0 ? (profitNum / riskNum).toFixed(1) : '0'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')

    try {
      let initialModalNum = parseFloat(manualModal) || 1000

      if (modalSource === 'mt5' && mt5Data && mt5Data.length > 0) {
        const selectedConn = mt5Data.find((c: any) => c.id === selectedMt5Id) || mt5Data[0]
        if (selectedConn?.balance) {
          initialModalNum = Number(selectedConn.balance)
        }
      }

      const payload = {
        name,
        mt5_connection_id: modalSource === 'mt5' ? (selectedMt5Id || (mt5Data?.[0]?.id ?? null)) : null,
        initial_modal: initialModalNum,
        is_manual_modal: modalSource === 'manual',
        profit_plan_percent: parseFloat(profitPlanPercent),
        risk_plan_percent: parseFloat(riskPlanPercent),
        pip_risk: parseFloat(pipRisk),
        pip_value_per_lot: parseFloat(pipValue),
        goal_level_target: parseInt(goalLevelTarget, 10),
        rules_notes: rulesNotes,
        set_active: true
      }

      const res = await fetch('/api/compounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Gagal membuat plan compounding')
      }

      const json = await res.json()
      if (json.plan?.id) {
        router.push(`/compounding/${json.plan.id}`)
      } else {
        router.push('/compounding')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat membuat plan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto px-2 sm:px-4">
      {/* Header & Navigation */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link
          href="/compounding"
          className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            Buat Plan Compounding Baru
          </h1>
          <p className="text-xs text-muted-foreground">
            Tentukan parameter pertumbuhan modal bertahap &amp; catatan aturan trading pribadi
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info & Source Modal Card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span>Informasi Utama &amp; Sumber Modal</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Nama Plan Compounding
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Compounding XAUUSD 2026 - Plan A"
              className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Sumber Modal Awal
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModalSource('mt5')}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  modalSource === 'mt5'
                    ? 'border-primary bg-primary/10 text-foreground font-bold'
                    : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Link2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
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
                    ? 'border-primary bg-primary/10 text-foreground font-bold'
                    : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted'
                }`}
              >
                <DollarSign className="h-4 w-4 text-primary shrink-0 mt-0.5" />
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
              {isLoadingMt5 ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Memuat akun MT5...</span>
                </div>
              ) : mt5Data && mt5Data.length > 0 ? (
                <select
                  value={selectedMt5Id}
                  onChange={(e) => setSelectedMt5Id(e.target.value)}
                  className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                >
                  <option value="">Pilih akun MT5...</option>
                  {mt5Data.map((conn: any) => {
                    const label = conn.brokerName || conn.broker_name || conn.name || 'Akun MT5'
                    const accNo = conn.accountNumber || conn.account_number || ''
                    const isCent = conn.accountType === 'cent' || conn.account_type === 'cent'
                    const rawBal = Number(conn.currentBalance ?? conn.balance ?? conn.current_balance ?? 0)
                    const balUsd = isCent ? rawBal / 100 : rawBal
                    return (
                      <option key={conn.id} value={conn.id}>
                        {label} {accNo ? `(#${accNo})` : ''} — ${balUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD {isCent ? `(${rawBal.toLocaleString('en-US')} USC - Akun Cent)` : ''}
                      </option>
                    )
                  })}
                </select>
              ) : (
                <p className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800/40">
                  Belum ada akun MT5 terhubung. Menggunakan saldo simulasi manual.
                </p>
              )}
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
                placeholder="1000"
                className="w-full px-4 py-2.5 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
              />
            </div>
          )}
        </div>

        {/* Calculation Parameters Card */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6 shadow-sm">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <span>Parameter Risiko &amp; Target per Level</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Target Profit Plan (%)
                </label>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono">{profitPlanPercent}%</span>
              </div>
              <input
                type="number"
                step="0.1"
                value={profitPlanPercent}
                onChange={(e) => setProfitPlanPercent(e.target.value)}
                className="w-full px-4 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Risk Plan per Level (%)
                </label>
                <span className="text-xs font-bold text-red-700 dark:text-red-400 font-mono">{riskPlanPercent}%</span>
              </div>
              <input
                type="number"
                step="0.05"
                value={riskPlanPercent}
                onChange={(e) => setRiskPlanPercent(e.target.value)}
                className="w-full px-4 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
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
                className="w-full px-4 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
              />
            </div>

            <div>
              {(() => {
                const selectedConn = modalSource === 'mt5' && mt5Data ? (mt5Data.find((c: any) => c.id === selectedMt5Id) || mt5Data[0]) : null
                const isCent = selectedConn ? (selectedConn.accountType === 'cent' || selectedConn.account_type === 'cent') : false
                const unitLabel = isCent ? 'USC' : 'USD'

                return (
                  <>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Nilai {unitLabel} per Pip per Lot ({unitLabel})
                    </label>
                    <input
                      type="number"
                      value={pipValue}
                      onChange={(e) => setPipValue(e.target.value)}
                      placeholder={isCent ? '1000' : '10'}
                      className="w-full px-4 py-2 bg-muted/40 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {isCent ? '💡 Untuk akun Cent, standar XAUUSD biasanya 1000 USC per pip/lot.' : '💡 Untuk akun Standard, standar XAUUSD biasanya $10 USD per pip/lot.'}
                    </span>
                  </>
                )
              })()}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between text-xs font-mono">
            <span className="text-amber-900 dark:text-amber-300 font-sans font-semibold">Preview Ratio Risk:Reward</span>
            <span className="font-extrabold text-amber-900 dark:text-amber-300 text-sm">
              RR 1:{rrRatio}
            </span>
          </div>
        </div>

        {/* SECTION "CATATAN & ATURAN TRADING" */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              Catatan &amp; Aturan Trading Pribadi (Rules)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Tuliskan aturan compounding pribadi (misal: &quot;Maksimal 2 trade per hari&quot;, &quot;SL Wajib 50 Pips&quot;, &quot;Jangan trade saat high impact news&quot;).
          </p>

          <textarea
            rows={4}
            value={rulesNotes}
            onChange={(e) => setRulesNotes(e.target.value)}
            placeholder="Tuliskan aturan disiplin compounding Anda di sini..."
            className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-sans"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/compounding"
            className="px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-bold transition-colors"
          >
            Batal
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || !name}
            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2 shadow-md cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses Plan...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Buat &amp; Aktifkan Plan</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
