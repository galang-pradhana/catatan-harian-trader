'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  DollarSign,
  FileText,
  Edit3,
  Loader2,
  RefreshCw,
  ExternalLink,
  Crown,
  Calendar,
  Sparkles,
  Save,
  X,
  RotateCcw,
  Zap,
  Link2,
} from 'lucide-react'
import { CompoundingRoadmap, RoadmapLevelNode } from '@/components/shared/compounding-roadmap'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MT5ConnectionOption {
  id: string
  name: string
  currentBalance: number
  account_type: string
}


interface PlanDetail {
  id: string
  name: string
  source: string
  initialModal: number
  isManualModal: boolean
  profitPlanPercent: number
  riskPlanPercent: number
  pipRisk: number
  pipValue: number
  goalLevelTarget: number
  rulesNotes: string
  isActive: boolean
  isArchived: boolean
  status: string
  createdAt: string
  currentActiveLevel: number
  currentBalance: number
  mt5_connection_id: string | null
}

interface LevelRow {
  id: string
  level: number
  targetPlan: number
  assetPlan: number
  idealLot: number
  riskAmount: number
  isAchieved: boolean
  manualOverride: boolean
  achievedAt: string | null
}

export default function CompoundingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const planId = params.id as string

  const [selectedLevel, setSelectedLevel] = useState<number | null>(null)
  const [isEditingRules, setIsEditingRules] = useState(false)
  const [rulesDraft, setRulesDraft] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Edit Plan Form State
  const [editName, setEditName] = useState('')
  const [editProfit, setEditProfit] = useState('')
  const [editRisk, setEditRisk] = useState('')
  const [editPipRisk, setEditPipRisk] = useState('')
  // Sumber saldo: 'mt5' = dari akun MT5, 'manual' = modal manual
  const [editMt5Source, setEditMt5Source] = useState<'mt5' | 'manual'>('manual')
  const [editMt5ConnectionId, setEditMt5ConnectionId] = useState<string>('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['compounding-plan-detail', planId],
    queryFn: async () => {
      const res = await fetch(`/api/compounding/${planId}`)
      if (!res.ok) throw new Error('Gagal memuat detail plan compounding')
      return res.json() as Promise<{ success: boolean; plan: PlanDetail; levels: LevelRow[] }>
    },
    staleTime: 15_000,
  })

  const plan = data?.plan
  const levels = data?.levels || []

  // Fetch data akun MT5 yang terkoneksi (untuk dropdown edit plan)
  const { data: mt5Data } = useQuery({
    queryKey: ['mt5-connections-edit'],
    queryFn: async () => {
      const res = await fetch('/api/mt5/connections')
      if (!res.ok) return []
      const json = await res.json()
      return (json.connections || []) as MT5ConnectionOption[]
    },
    staleTime: 60_000,
  })

  React.useEffect(() => {
    if (plan) {
      setRulesDraft(plan.rulesNotes || '')
      setEditName(plan.name)
      setEditProfit(String(plan.profitPlanPercent))
      setEditRisk(String(plan.riskPlanPercent))
      setEditPipRisk(String(plan.pipRisk))
      // Inisialisasi sumber saldo dari plan
      if (plan.mt5_connection_id) {
        setEditMt5Source('mt5')
        setEditMt5ConnectionId(plan.mt5_connection_id)
      } else {
        setEditMt5Source('manual')
        setEditMt5ConnectionId('')
      }
    }
  }, [plan])

  // Mutation: Toggle level achievement manually
  const toggleLevelMutation = useMutation({
    mutationFn: async ({ levelNumber, isAchieved }: { levelNumber: number; isAchieved: boolean }) => {
      const res = await fetch(`/api/compounding/${planId}/levels`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level_number: levelNumber, is_achieved: isAchieved }),
      })
      if (!res.ok) throw new Error('Gagal memperbarui status level')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compounding-plan-detail', planId] })
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
    },
  })

  // Mutation: Save Rules Notes
  const saveRulesMutation = useMutation({
    mutationFn: async (newRules: string) => {
      const res = await fetch(`/api/compounding/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules_notes: newRules }),
      })
      if (!res.ok) throw new Error('Gagal menyimpan aturan trading')
      return res.json()
    },
    onSuccess: () => {
      setIsEditingRules(false)
      queryClient.invalidateQueries({ queryKey: ['compounding-plan-detail', planId] })
    },
  })

  // Mutation: Reset Baseline Modal to Current Balance
  const resetBaselineMutation = useMutation({
    mutationFn: async (newModal: number) => {
      const res = await fetch(`/api/compounding/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_modal: newModal }),
      })
      if (!res.ok) throw new Error('Gagal menyesuaikan saldo baseline modal')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compounding-plan-detail', planId] })
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
    },
  })

  // Mutation: Save Plan Parameters (Edit Modal)
  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: editName,
        profit_plan_percent: parseFloat(editProfit),
        risk_plan_percent: parseFloat(editRisk),
        pip_risk: parseFloat(editPipRisk),
        rules_notes: rulesDraft,
        is_manual_modal: editMt5Source === 'manual',
        mt5_connection_id: editMt5Source === 'mt5' ? (editMt5ConnectionId || null) : null,
      }
      const res = await fetch(`/api/compounding/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal memperbarui plan compounding')
      return res.json()
    },
    onSuccess: () => {
      setIsEditModalOpen(false)
      queryClient.invalidateQueries({ queryKey: ['compounding-plan-detail', planId] })
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16 text-muted-foreground text-xs gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Memuat detail plan compounding &amp; peta jalan...</span>
      </div>
    )
  }

  if (isError || !plan) {
    return (
      <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto my-8">
        <p className="text-sm text-destructive font-medium">Gagal memuat detail plan compounding</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba Lagi
        </Button>
      </div>
    )
  }

  // DYNAMIC DEDICATED REALTIME CALCULATIONS based on active balance
  const currentBal = plan.currentBalance > 0 ? plan.currentBalance : plan.initialModal
  const realtimeRisk = Math.floor((currentBal * (plan.riskPlanPercent / 100)) / 5) * 5
  const realtimeLot = parseFloat((realtimeRisk / (plan.pipRisk * (plan.pipValue || 10))).toFixed(2))
  const realtimeTarget = Math.floor((currentBal * (plan.profitPlanPercent / 100)) / 10) * 10
  const realtimeAssetTarget = currentBal + realtimeTarget

  // Calculate progress % towards next level target
  const progressPercent = realtimeTarget > 0 ? Math.min(Math.max(((currentBal - (currentBal - realtimeTarget)) / realtimeTarget) * 100, 0), 100) : 0

  const handleSelectLevelFromRoadmap = (lvlNum: number) => {
    setSelectedLevel(lvlNum)
    const el = document.getElementById(`level-row-${lvlNum}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/compounding"
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">{plan.name}</h1>
              {plan.isActive && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground shadow-sm flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  <span>Plan Utama Aktif</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Sumber Modal: <span className="font-semibold text-foreground font-mono">{plan.source}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {plan.currentBalance > 0 && Math.abs(plan.currentBalance - plan.initialModal) > 100 && (
            <Button
              variant="outline"
              size="sm"
              disabled={resetBaselineMutation.isPending}
              onClick={() => {
                if (confirm(`Sesuaikan baseline modal plan dari $${plan.initialModal.toLocaleString()} menjadi saldo terkini $${plan.currentBalance.toLocaleString()}? Ini akan meregenerasi tabel 100 level compounding.`)) {
                  resetBaselineMutation.mutate(plan.currentBalance)
                }
              }}
              className="text-xs font-bold gap-1 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-600/40 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              title="Perbarui baseline modal awal compounding sesuai saldo akun saat ini (setelah WD / Deposit)"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Baseline Modal (${plan.currentBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-bold gap-1.5"
          >
            <Edit3 className="h-3.5 w-3.5 text-primary" />
            <span>Edit Parameter &amp; Rules</span>
          </Button>

          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* REQUIREMENT 1: VISUAL ROADMAP STEPPER */}
      <CompoundingRoadmap
        levels={levels as RoadmapLevelNode[]}
        currentActiveLevel={plan.currentActiveLevel}
        onSelectLevel={handleSelectLevelFromRoadmap}
        selectedLevel={selectedLevel}
      />

      {/* REQUIREMENT 3: STICKY SUMMARY & PROGRESS BAR */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/40 flex items-center justify-center text-amber-900 dark:text-amber-400 font-black text-lg font-mono">
              L{plan.currentActiveLevel}
            </div>
            <div>
              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3 w-3" /> Saldo Terkini &amp; Position Size
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-foreground font-mono">
                  ${plan.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-muted-foreground font-sans font-medium">
                  (Modal Awal Baseline: ${plan.initialModal.toLocaleString()})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Rekomendasi Ideal Lot ({plan.riskPlanPercent}%)</span>
              <span className="text-sm font-extrabold text-amber-900 dark:text-amber-300 font-mono bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/40 px-2.5 py-1 rounded-xl inline-block">
                {realtimeLot} Lot
              </span>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Batasan Risk ($)</span>
              <span className="text-sm font-extrabold text-red-700 dark:text-red-400 font-mono bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/40 px-2.5 py-1 rounded-xl inline-block">
                -${realtimeRisk}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Target Asset Level Ini</span>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
                ${realtimeAssetTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar Balance vs Target Level */}
        <div className="space-y-1.5 pt-2 border-t border-border">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-muted-foreground font-mono">
              💰 Saldo ${plan.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} dari target ${realtimeAssetTarget.toLocaleString()} (+${realtimeTarget})
            </span>
            <span className="font-mono text-amber-800 dark:text-amber-400 font-bold">
              {progressPercent.toFixed(1)}% menuju Level {plan.currentActiveLevel + 1}
            </span>
          </div>

          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/50">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* REQUIREMENT 2: SECTION "CATATAN & ATURAN TRADING" */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h2 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
              Catatan &amp; Aturan Trading Pribadi (Rules)
            </h2>
          </div>

          {!isEditingRules ? (
            <button
              type="button"
              onClick={() => setIsEditingRules(true)}
              className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5" /> Edit Rules
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingRules(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={saveRulesMutation.isPending}
                onClick={() => saveRulesMutation.mutate(rulesDraft)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-1"
              >
                {saveRulesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Simpan Rules</span>
              </Button>
            </div>
          )}
        </div>

        {isEditingRules ? (
          <textarea
            rows={4}
            value={rulesDraft}
            onChange={(e) => setRulesDraft(e.target.value)}
            className="w-full px-4 py-3 bg-muted/40 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-sans"
            placeholder="Tuliskan aturan compounding pribadi Anda di sini..."
          />
        ) : (
          <div className="p-3.5 rounded-xl bg-muted/30 border border-border text-xs text-foreground leading-relaxed whitespace-pre-line font-sans font-medium">
            {plan.rulesNotes ? (
              plan.rulesNotes
            ) : (
              <span className="text-muted-foreground italic">
                Belum ada aturan trading ditambahkan. Klik &quot;Edit Rules&quot; untuk mencatat aturan disiplin Anda.
              </span>
            )}
          </div>
        )}
      </div>

      {/* DATA TABLE & CARDS FOR compounding_levels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Detail Rincian Level Compounding ({levels.length} Level)
          </h2>
          <span className="text-[11px] text-muted-foreground">
            💡 Centang checkbox untuk Override Manual status Tercapai
          </span>
        </div>

        {/* MOBILE VIEW: Stacked Level Cards (<768px) */}
        <div className="block md:hidden space-y-3">
          {levels.slice(0, 50).map((item) => {
            const isActive = item.level === plan.currentActiveLevel
            const isSelected = selectedLevel === item.level

            return (
              <div
                id={`level-row-${item.level}`}
                key={item.level}
                className={cn(
                  'p-4 rounded-2xl border transition-all space-y-3',
                  isActive
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500 shadow-sm'
                    : item.isAchieved
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/40'
                    : 'bg-card border-border',
                  isSelected && !isActive && 'ring-2 ring-primary'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.isAchieved}
                      onChange={(e) =>
                        toggleLevelMutation.mutate({
                          levelNumber: item.level,
                          isAchieved: e.target.checked
                        })
                      }
                      className="h-4 w-4 rounded accent-primary cursor-pointer"
                      title="Override Manual Status Level"
                    />

                    <span
                      className={cn(
                        'font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg',
                        isActive
                          ? 'bg-amber-500 text-black'
                          : item.isAchieved
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      Level {item.level}
                    </span>

                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                        Aktif
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block font-medium">Ideal Lot</span>
                    <span className="font-mono text-xs font-extrabold text-amber-800 dark:text-amber-400">
                      {item.idealLot} Lot
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Target Plan</span>
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                      +${item.targetPlan}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-muted-foreground block">Batasan Risk</span>
                    <span className="font-mono font-semibold text-red-700 dark:text-red-400">
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

                {item.achievedAt && (
                  <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono pt-1">
                    ✓ Tercapai pada {new Date(item.achievedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* DESKTOP VIEW: Data Table (>=768px) */}
        <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3.5 px-4 text-center w-12">Check</th>
                <th className="py-3.5 px-4">Level</th>
                <th className="py-3.5 px-4">Target Plan (+{plan.profitPlanPercent}%)</th>
                <th className="py-3.5 px-4">Risk Amount (-{plan.riskPlanPercent}%)</th>
                <th className="py-3.5 px-4">Ideal Position Size</th>
                <th className="py-3.5 px-4">Asset Plan (Running Balance)</th>
                <th className="py-3.5 px-4 text-center">Status &amp; Timestamp</th>
                <th className="py-3.5 px-4 text-center">Trade History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {levels.slice(0, 50).map((item) => {
                const isActive = item.level === plan.currentActiveLevel
                const isSelected = selectedLevel === item.level

                return (
                  <tr
                    id={`level-row-${item.level}`}
                    key={item.level}
                    className={cn(
                      'transition-colors',
                      isActive
                        ? 'bg-amber-50 dark:bg-amber-950/40 font-bold border-l-4 border-l-amber-500'
                        : item.isAchieved
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50/70'
                        : 'hover:bg-muted/40',
                      isSelected && !isActive && 'bg-primary/10'
                    )}
                  >
                    {/* Manual Override Checkbox */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={item.isAchieved}
                        onChange={(e) =>
                          toggleLevelMutation.mutate({
                            levelNumber: item.level,
                            isAchieved: e.target.checked
                          })
                        }
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                        title="Klik untuk Override Manual Status Tercapai"
                      />
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-foreground">
                      Level {item.level}
                    </td>

                    <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-mono font-bold">
                      +${item.targetPlan}
                    </td>

                    <td className="py-3 px-4 text-red-700 dark:text-red-400 font-mono font-semibold">
                      -${item.riskAmount}
                    </td>

                    <td className="py-3 px-4 text-amber-800 dark:text-amber-400 font-mono font-extrabold">
                      {item.idealLot} Lot
                    </td>

                    <td className="py-3 px-4 font-mono text-foreground font-bold">
                      ${item.assetPlan.toLocaleString()}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {item.isAchieved ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                            <CheckCircle2 className="h-3 w-3" /> Tercapai
                          </span>
                          {item.achievedAt && (
                            <span className="text-[10px] text-muted-foreground block font-mono">
                              {new Date(item.achievedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      ) : isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Belum</span>
                      )}
                    </td>

                    {/* Trade Connection CTA */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => router.push('/trades')}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Lihat trade pada periode level ini"
                      >
                        <span>Trade Journal</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT PLAN MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-primary" />
                <span>Edit Parameter &amp; Aturan Plan</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Nama Plan */}
              <div>
                <label className="block font-semibold mb-1 text-foreground">Nama Plan</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary font-medium"
                />
              </div>

              {/* Sumber Saldo Compounding */}
              <div>
                <label className="block font-semibold mb-1.5 text-foreground flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5 text-primary" /> Sumber Saldo Compounding
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setEditMt5Source('mt5')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                      editMt5Source === 'mt5'
                        ? 'border-primary bg-primary/10 text-foreground font-bold'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span className="text-xs block">📊 Otomatis dari MT5</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Tarik saldo real terkini</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMt5Source('manual')}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all cursor-pointer',
                      editMt5Source === 'manual'
                        ? 'border-primary bg-primary/10 text-foreground font-bold'
                        : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span className="text-xs block">💰 Modal Manual</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Mode simulasi / manual</span>
                  </button>
                </div>

                {editMt5Source === 'mt5' && (
                  <div>
                    {mt5Data && mt5Data.length > 0 ? (
                      <select
                        value={editMt5ConnectionId}
                        onChange={(e) => setEditMt5ConnectionId(e.target.value)}
                        className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary font-mono text-xs"
                      >
                        <option value="">Pilih akun MT5...</option>
                        {mt5Data.map((conn: MT5ConnectionOption) => {
                          const accType = conn.account_type || 'standard'
                          const rawBal = conn.currentBalance || 0
                          const displayBal = accType === 'cent' ? rawBal / 100 : rawBal
                          return (
                            <option key={conn.id} value={conn.id}>
                              {conn.name} — ${displayBal.toLocaleString('en-US', { maximumFractionDigits: 2 })} {accType === 'cent' ? '(Akun Cent)' : ''}
                            </option>
                          )
                        })}
                      </select>
                    ) : (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/40">
                        Belum ada akun MT5 terkoneksi. Pergi ke menu <strong>Import / MT5</strong> untuk menambahkan.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Profit Target (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editProfit}
                    onChange={(e) => setEditProfit(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Risk (%)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={editRisk}
                    onChange={(e) => setEditRisk(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-foreground">SL (Pips)</label>
                  <input
                    type="number"
                    value={editPipRisk}
                    onChange={(e) => setEditPipRisk(e.target.value)}
                    className="w-full px-3 py-2 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Catatan &amp; Aturan Trading</label>
                <textarea
                  rows={3}
                  value={rulesDraft}
                  onChange={(e) => setRulesDraft(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-muted/40 border border-border rounded-xl text-foreground focus:outline-none focus:border-primary font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={savePlanMutation.isPending}
                onClick={() => savePlanMutation.mutate()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5"
              >
                {savePlanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Simpan Perubahan</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
