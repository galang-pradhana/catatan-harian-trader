'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calculator,
  Plus,
  TrendingUp,
  Target,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Sparkles,
  Crown,
  FileText,
  RefreshCw,
  ShoppingBag,
  Trophy,
  CheckCircle2,
  Calendar,
  Zap,
  Gift,
  Trash2,
  Brain,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'
import { CompoundingQuickActions } from '@/components/shared/compounding-quick-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CompoundingPlanItem {
  id: string
  name: string
  mt5_connection_id: string | null
  source: string
  initial_modal: number
  is_manual_modal: boolean
  profit_plan_percent: number
  risk_plan_percent: number
  pip_risk: number
  pip_value_per_lot: number
  goal_level_target: number
  rules_notes: string
  is_active: boolean
  is_archived: boolean
  status: string
  created_at: string
  current_level: number
  current_balance: number
  target_asset_level: number
  levels_count: number
}

export interface PurchaseGoal {
  id: string
  name: string
  targetAmount: number
  currency: 'IDR' | 'USD'
  iconEmoji: string
  deadline?: string
}

export interface BehaviorGoal {
  id: string
  title: string
  metricType: 'discipline_trades' | 'win_rate' | 'emotional_streak' | 'total_trades'
  targetValue: number
  deadline?: string
}

const DEFAULT_PURCHASE_GOALS: PurchaseGoal[] = [
  {
    id: 'p1',
    name: 'iPhone 17 Pro Max',
    targetAmount: 25000000,
    currency: 'IDR',
    iconEmoji: '📱',
    deadline: '31 Des 2026',
  },
  {
    id: 'p2',
    name: 'Dana Liburan Bali',
    targetAmount: 10000000,
    currency: 'IDR',
    iconEmoji: '✈️',
    deadline: '30 Sep 2026',
  },
]

const DEFAULT_BEHAVIOR_GOALS: BehaviorGoal[] = [
  {
    id: 'b1',
    title: 'Konsistensi Trading (Ikut Rules)',
    metricType: 'discipline_trades',
    targetValue: 20,
    deadline: '31 Mei 2026',
  },
  {
    id: 'b2',
    title: 'Improve Win Rate (> 65%)',
    metricType: 'win_rate',
    targetValue: 65,
    deadline: '30 Juni 2026',
  },
  {
    id: 'b3',
    title: 'Streak Emosi Sehat (7 Hari)',
    metricType: 'emotional_streak',
    targetValue: 7,
    deadline: '31 Mei 2026',
  },
]

const PURCHASE_GOALS_KEY = 'trading_journal_purchase_goals_v1'
const BEHAVIOR_GOALS_KEY = 'trading_journal_behavior_goals_v1'

function CompoundingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')

  // Main Page Tab: 'capital' (Target Modal) | 'behavior' (Target Perilaku)
  const [mainTab, setMainTab] = useState<'capital' | 'behavior'>(urlTab === 'behavior' ? 'behavior' : 'capital')
  const [planSubTab, setPlanSubTab] = useState<'active' | 'archived'>('active')

  useEffect(() => {
    if (urlTab === 'behavior') setMainTab('behavior')
    else if (urlTab === 'capital') setMainTab('capital')
  }, [urlTab])

  const queryClient = useQueryClient()

  // ── Fetch Compounding Plans ──────────────────────────────────
  const { data: plansData, isLoading, isError, refetch } = useQuery({
    queryKey: ['compounding-plans-list'],
    queryFn: async () => {
      const res = await fetch('/api/compounding?include_archived=true')
      if (!res.ok) throw new Error('Gagal memuat plan compounding')
      const json = await res.json()
      return json.plans as CompoundingPlanItem[]
    },
    staleTime: 30_000,
  })

  // ── Fetch Live Real Metrics for Behavior & Purchase Goals ─────
  const { data: tradesMetricsData } = useQuery({
    queryKey: ['trades-real-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/trades?limit=100')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 30_000,
  })

  const { data: psychologyLogsData } = useQuery({
    queryKey: ['psychology-real-metrics'],
    queryFn: async () => {
      const res = await fetch('/api/psychology/logs')
      if (!res.ok) return null
      return res.json()
    },
    staleTime: 30_000,
  })

  // Real data calculations
  const realMetrics = useMemo(() => {
    const trades: any[] = tradesMetricsData?.trades ?? []
    const closedTrades = trades.filter((t) => t.status === 'closed')
    const winTrades = closedTrades.filter((t) => (t.pnl || 0) > 0)
    const winRate = closedTrades.length > 0 ? (winTrades.length / closedTrades.length) * 100 : 0
    const disciplineCount = trades.filter((t) => t.trade_journal?.discipline === 'yes' || t.discipline === 'yes').length
    const disciplineStreak = psychologyLogsData?.disciplineStreak ?? 0

    return {
      totalTradesCount: trades.length,
      closedTradesCount: closedTrades.length,
      winRate,
      disciplineCount,
      disciplineStreak,
    }
  }, [tradesMetricsData, psychologyLogsData])

  // Current balance / Equity from active plan or default
  const activePlan = useMemo(() => {
    return (plansData || []).find((p) => p.is_active && !p.is_archived) || plansData?.[0]
  }, [plansData])

  const currentEquityUsd = activePlan?.current_balance ?? 1000
  const USD_TO_IDR_RATE = 15500
  const currentEquityIdr = currentEquityUsd * USD_TO_IDR_RATE

  // ── Purchase Goals State (Target Pembelian Barang) ───────────
  const [purchaseGoals, setPurchaseGoals] = useState<PurchaseGoal[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PURCHASE_GOALS
    try {
      const raw = localStorage.getItem(PURCHASE_GOALS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return DEFAULT_PURCHASE_GOALS
  })

  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false)
  const [newPurchaseName, setNewPurchaseName] = useState('')
  const [newPurchaseAmount, setNewPurchaseAmount] = useState('')
  const [newPurchaseCurrency, setNewPurchaseCurrency] = useState<'IDR' | 'USD'>('IDR')
  const [newPurchaseIcon, setNewPurchaseIcon] = useState('📱')
  const [newPurchaseDeadline, setNewPurchaseDeadline] = useState('')

  const handleAddPurchaseGoal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPurchaseName.trim() || !newPurchaseAmount) return
    const amount = Number(newPurchaseAmount)
    if (isNaN(amount) || amount <= 0) return

    const newGoal: PurchaseGoal = {
      id: `p_${Date.now()}`,
      name: newPurchaseName.trim(),
      targetAmount: amount,
      currency: newPurchaseCurrency,
      iconEmoji: newPurchaseIcon,
      deadline: newPurchaseDeadline.trim() || undefined,
    }
    const next = [...purchaseGoals, newGoal]
    setPurchaseGoals(next)
    try { localStorage.setItem(PURCHASE_GOALS_KEY, JSON.stringify(next)) } catch {}
    setNewPurchaseName('')
    setNewPurchaseAmount('')
    setIsAddPurchaseModalOpen(false)
  }

  const handleDeletePurchaseGoal = (id: string) => {
    const next = purchaseGoals.filter((g) => g.id !== id)
    setPurchaseGoals(next)
    try { localStorage.setItem(PURCHASE_GOALS_KEY, JSON.stringify(next)) } catch {}
  }

  // ── Behavior Goals State (Target Perilaku) ───────────────────
  const [behaviorGoals, setBehaviorGoals] = useState<BehaviorGoal[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_BEHAVIOR_GOALS
    try {
      const raw = localStorage.getItem(BEHAVIOR_GOALS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return DEFAULT_BEHAVIOR_GOALS
  })

  const [isAddBehaviorModalOpen, setIsAddBehaviorModalOpen] = useState(false)
  const [newBehaviorTitle, setNewBehaviorTitle] = useState('')
  const [newBehaviorMetricType, setNewBehaviorMetricType] = useState<BehaviorGoal['metricType']>('discipline_trades')
  const [newBehaviorTargetValue, setNewBehaviorTargetValue] = useState('')
  const [newBehaviorDeadline, setNewBehaviorDeadline] = useState('')

  const handleAddBehaviorGoal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBehaviorTitle.trim() || !newBehaviorTargetValue) return
    const targetVal = Number(newBehaviorTargetValue)
    if (isNaN(targetVal) || targetVal <= 0) return

    const newGoal: BehaviorGoal = {
      id: `b_${Date.now()}`,
      title: newBehaviorTitle.trim(),
      metricType: newBehaviorMetricType,
      targetValue: targetVal,
      deadline: newBehaviorDeadline.trim() || undefined,
    }
    const next = [...behaviorGoals, newGoal]
    setBehaviorGoals(next)
    try { localStorage.setItem(BEHAVIOR_GOALS_KEY, JSON.stringify(next)) } catch {}
    setNewBehaviorTitle('')
    setNewBehaviorTargetValue('')
    setIsAddBehaviorModalOpen(false)
  }

  const handleDeleteBehaviorGoal = (id: string) => {
    const next = behaviorGoals.filter((g) => g.id !== id)
    setBehaviorGoals(next)
    try { localStorage.setItem(BEHAVIOR_GOALS_KEY, JSON.stringify(next)) } catch {}
  }

  // ── Compounding Plan Mutations ───────────────────────────────
  const setActiveMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/compounding/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      if (!res.ok) throw new Error('Gagal menjadikan plan aktif')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
      queryClient.invalidateQueries({ queryKey: ['compounding-plans'] })
    },
  })

  const toggleArchiveMutation = useMutation({
    mutationFn: async ({ planId, isArchived }: { planId: string; isArchived: boolean }) => {
      const res = await fetch(`/api/compounding/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: !isArchived }),
      })
      if (!res.ok) throw new Error('Gagal mengubah status arsip')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/compounding/${planId}/duplicate`, { method: 'POST' })
      if (!res.ok) throw new Error('Gagal menduplikasi plan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/compounding/${planId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus plan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
    },
  })

  const filteredPlans = (plansData || []).filter((p) => {
    if (planSubTab === 'archived') return p.is_archived
    return !p.is_archived
  })

  const handleMainTabChange = (nextTab: 'capital' | 'behavior') => {
    setMainTab(nextTab)
    router.replace(`/compounding?tab=${nextTab}`)
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Main Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              Compounding &amp; Target Trading
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Kelola peta jalan pertumbuhan modal serta pantau target barang &amp; kedisiplinan secara otomatis.
          </p>
        </div>

        {mainTab === 'capital' ? (
          <Link
            href="/compounding/create"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Plan Compounding</span>
          </Link>
        ) : (
          <Button
            size="sm"
            onClick={() => setIsAddBehaviorModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold shadow-md cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Target Perilaku Baru
          </Button>
        )}
      </div>

      {/* 2 MAIN TABS SWITCHER */}
      <div className="bg-card border border-border p-1.5 rounded-2xl flex items-center gap-2 shadow-sm max-w-md">
        <button
          type="button"
          onClick={() => handleMainTabChange('capital')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none',
            mainTab === 'capital'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Calculator className="h-4 w-4" />
          <span>Target Modal &amp; Barang</span>
        </button>

        <button
          type="button"
          onClick={() => handleMainTabChange('behavior')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer select-none',
            mainTab === 'behavior'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Trophy className="h-4 w-4" />
          <span>Target Perilaku (Otomatis)</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 1: TARGET MODAL (COMPOUNDING PLANS + TARGET PEMBELIAN)   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mainTab === 'capital' && (
        <div className="space-y-8 animate-in fade-in-50 duration-200">
          {/* SECTION A: COMPOUNDING PLANS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlanSubTab('active')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    planSubTab === 'active'
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Plan Compounding Aktif ({ (plansData || []).filter(p => !p.is_archived).length })
                </button>
                <button
                  type="button"
                  onClick={() => setPlanSubTab('archived')}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    planSubTab === 'archived'
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Arsip ({ (plansData || []).filter(p => p.is_archived).length })
                </button>
              </div>
            </div>

            {/* Loading state */}
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl h-36 animate-pulse" />
                ))}
              </div>
            )}

            {/* Error state */}
            {isError && !isLoading && (
              <div className="bg-card border border-destructive/30 rounded-2xl p-8 text-center space-y-3">
                <p className="text-sm text-destructive font-medium">Gagal memuat daftar plan compounding</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Coba Lagi
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !isError && filteredPlans.length === 0 && (
              <div className="bg-card border border-border rounded-3xl p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
                <Calculator className="h-10 w-10 text-primary opacity-60" />
                <p className="text-xs text-muted-foreground">
                  {planSubTab === 'archived' ? 'Tidak ada plan compounding terarsip.' : 'Belum ada plan compounding.'}
                </p>
              </div>
            )}

            {/* Active Plans List */}
            {!isLoading && !isError && filteredPlans.length > 0 && (
              <div className="space-y-4">
                {filteredPlans.map((plan) => {
                  const startModal = plan.initial_modal
                  const targetAsset = plan.target_asset_level
                  const currentBal = plan.current_balance
                  const range = targetAsset - startModal
                  const progress = range > 0 ? Math.min(Math.max(((currentBal - startModal) / range) * 100, 0), 100) : 0

                  return (
                    <div
                      key={plan.id}
                      onClick={() => router.push(`/compounding/${plan.id}`)}
                      className={cn(
                        'group bg-card border rounded-2xl p-5 md:p-6 transition-all shadow-sm relative overflow-hidden cursor-pointer hover:border-primary/50',
                        plan.is_active
                          ? 'border-primary/60 bg-gradient-to-br from-card via-card to-primary/5 shadow-md shadow-primary/10'
                          : 'border-border'
                      )}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2 max-w-xl">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="font-extrabold text-base text-foreground group-hover:text-primary transition-colors">
                              {plan.name}
                            </h2>
                            {plan.is_active && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-primary text-primary-foreground shadow-sm flex items-center gap-1">
                                <Crown className="h-3 w-3" />
                                <span>Plan Utama Aktif</span>
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                            <span>Sumber Modal:</span>
                            <span className="font-semibold text-foreground font-mono">{plan.source}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Target Level Ini</span>
                            <span className="text-sm font-extrabold text-emerald-400 font-mono">
                              ${plan.target_asset_level.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                            </span>
                          </div>

                          <CompoundingQuickActions
                            planId={plan.id}
                            planName={plan.name}
                            isActive={plan.is_active}
                            isArchived={plan.is_archived}
                            onSetActive={() => setActiveMutation.mutate(plan.id)}
                            onEdit={() => router.push(`/compounding/${plan.id}`)}
                            onDuplicate={() => duplicateMutation.mutate(plan.id)}
                            onToggleArchive={() => toggleArchiveMutation.mutate({ planId: plan.id, isArchived: plan.is_archived })}
                            onDelete={() => {
                              if (confirm(`Hapus plan compounding "${plan.name}"?`)) {
                                deleteMutation.mutate(plan.id)
                              }
                            }}
                          />

                          <div className="p-2 rounded-xl bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                            <ChevronRight className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar Visual */}
                      <div className="mt-4 pt-3 border-t border-border/60 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px] font-semibold">
                          <span className="text-muted-foreground font-mono">
                            💰 Saldo Saat Ini: <strong className="text-foreground font-bold">${currentBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                          </span>
                          <span className="font-mono text-amber-400 font-bold">
                            {progress.toFixed(0)}% menuju Level {plan.current_level + 1}
                          </span>
                        </div>

                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border/40">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* SECTION B: TARGET PEMBELIAN BARANG (AUTO-CALCULATED PROGRESS FROM EQUITY) */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-amber-400" /> Target Pembelian Barang &amp; Impian
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Progress ketercapaian dihitung <strong className="text-foreground">otomatis</strong> dari saldo equity terkini (${currentEquityUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}).
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddPurchaseModalOpen(true)}
                className="text-xs font-bold border-amber-500/40 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> + Target Pembelian
              </Button>
            </div>

            {/* Target Purchase Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {purchaseGoals.map((goal) => {
                const isIdr = goal.currency === 'IDR'
                const userVal = isIdr ? currentEquityIdr : currentEquityUsd
                const targetVal = goal.targetAmount
                const pct = Math.min(100, Math.max(0, (userVal / targetVal) * 100))
                const remaining = Math.max(0, targetVal - userVal)
                const isReached = pct >= 100

                return (
                  <div
                    key={goal.id}
                    className={cn(
                      'p-4 rounded-2xl border space-y-3 transition-all relative overflow-hidden',
                      isReached
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                        : 'bg-muted/20 border-border/80 hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
                          {goal.iconEmoji}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-foreground">{goal.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            Target:{' '}
                            <strong className="text-foreground">
                              {isIdr ? `Rp ${targetVal.toLocaleString('id-ID')}` : `$${targetVal.toLocaleString()}`}
                            </strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs font-mono font-black px-2 py-0.5 rounded-full border', isReached ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-primary/20 text-primary border-primary/40')}>
                          {pct.toFixed(0)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePurchaseGoal(goal.id)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                          title="Hapus Goal"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Auto-Calculated Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', isReached ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-500 to-emerald-400')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-muted-foreground">
                          {goal.deadline ? `Deadline: ${goal.deadline}` : 'Tanpa Deadline'}
                        </span>
                        <span className={cn('font-bold', isReached ? 'text-emerald-400' : 'text-amber-400')}>
                          {isReached
                            ? '🎉 Goal Terpesan / Tercapai!'
                            : `Butuh ${isIdr ? `Rp ${remaining.toLocaleString('id-ID')}` : `$${remaining.toLocaleString()}`} profit lagi`}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 2: TARGET PERILAKU (AUTOMATIC REAL DATA METRICS)         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {mainTab === 'behavior' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-400" /> Target Perilaku &amp; Kedisiplinan (Otomatis)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kemajuan dihitung <strong className="text-foreground">otomatis</strong> dari data real trade jurnal &amp; psikologi trading Anda.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAddBehaviorModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs cursor-pointer shadow-sm"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> + Target Perilaku Baru
              </Button>
            </div>

            {/* Behavior Goals List */}
            <div className="space-y-4">
              {behaviorGoals.map((g) => {
                let actualVal = 0
                let unitLabel = ''
                let displayActual = ''

                if (g.metricType === 'discipline_trades') {
                  actualVal = realMetrics.disciplineCount
                  unitLabel = 'Trade Ikut Rules'
                  displayActual = `${actualVal} Trade`
                } else if (g.metricType === 'win_rate') {
                  actualVal = realMetrics.winRate
                  unitLabel = '% Win Rate'
                  displayActual = `${actualVal.toFixed(1)}%`
                } else if (g.metricType === 'emotional_streak') {
                  actualVal = realMetrics.disciplineStreak
                  unitLabel = 'Hari Streak Positif'
                  displayActual = `${actualVal} Hari`
                } else if (g.metricType === 'total_trades') {
                  actualVal = realMetrics.totalTradesCount
                  unitLabel = 'Total Trade'
                  displayActual = `${actualVal} Trade`
                }

                const pct = Math.min(100, Math.max(0, Math.round((actualVal / g.targetValue) * 100)))
                const isCompleted = pct >= 100

                return (
                  <div
                    key={g.id}
                    className={cn(
                      'p-5 rounded-2xl border space-y-3 transition-all relative overflow-hidden',
                      isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
                        : 'bg-card border-border hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-foreground">{g.title}</h4>
                          {isCompleted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-black flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Target Tercapai</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-3 mt-1 font-mono">
                          <span>
                            Target: <strong className="text-foreground">{g.targetValue} {unitLabel}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Aktual: <strong className="text-emerald-400">{displayActual}</strong>
                          </span>
                          {g.deadline && (
                            <>
                              <span>•</span>
                              <span>📅 Deadline: {g.deadline}</span>
                            </>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 font-mono">
                        <span className={cn('text-lg font-black', isCompleted ? 'text-emerald-400' : 'text-primary')}>
                          {pct}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteBehaviorGoal(g.id)}
                          className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                          title="Hapus Target"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-3 rounded-full bg-muted/60 overflow-hidden p-0.5 border border-border/40">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', isCompleted ? 'bg-emerald-400' : 'bg-gradient-to-r from-primary/80 to-primary')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
                        <span>Status: Data Real-Time</span>
                        <span>{displayActual} dari {g.targetValue} {unitLabel}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL 1: TAMBAH TARGET PEMBELIAN BARANG                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isAddPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-400" /> Tambah Target Pembelian Barang
            </h3>

            <form onSubmit={handleAddPurchaseGoal} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-foreground">Nama Target Barang / Goal</label>
                <Input
                  type="text"
                  placeholder="Contoh: iPhone 17 Pro Max / Dana Liburan"
                  value={newPurchaseName}
                  onChange={(e) => setNewPurchaseName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Nominal Target</label>
                  <Input
                    type="number"
                    placeholder="Contoh: 25000000"
                    value={newPurchaseAmount}
                    onChange={(e) => setNewPurchaseAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Mata Uang</label>
                  <select
                    value={newPurchaseCurrency}
                    onChange={(e) => setNewPurchaseCurrency(e.target.value as 'IDR' | 'USD')}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="IDR">Rupiah (Rp)</option>
                    <option value="USD">Dollar ($ USD)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Ikon / Emoji</label>
                  <select
                    value={newPurchaseIcon}
                    onChange={(e) => setNewPurchaseIcon(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="📱">📱 Gadget / Phone</option>
                    <option value="✈️">✈️ Liburan / Travel</option>
                    <option value="🚗">🚗 Kendaraan / Mobil</option>
                    <option value="💻">💻 Laptop / Workstation</option>
                    <option value="🏠">🏠 Properti / Rumah</option>
                    <option value="⌚">⌚ Aksesoris / Jam</option>
                    <option value="💎">💎 Investasi / Emas</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Deadline (Opsional)</label>
                  <Input
                    type="text"
                    placeholder="Contoh: 31 Des 2026"
                    value={newPurchaseDeadline}
                    onChange={(e) => setNewPurchaseDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" type="button" size="sm" onClick={() => setIsAddPurchaseModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" type="submit" size="sm" className="font-bold">
                  Simpan Goal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL 2: TAMBAH TARGET PERILAKU                             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isAddBehaviorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground border-b border-border pb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-400" /> Tambah Target Perilaku Baru
            </h3>

            <form onSubmit={handleAddBehaviorGoal} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-bold text-foreground">Nama / Judul Target</label>
                <Input
                  type="text"
                  placeholder="Contoh: Target 30 Trade Ikut Rules"
                  value={newBehaviorTitle}
                  onChange={(e) => setNewBehaviorTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-foreground">Jenis Metrik Otomatis</label>
                <select
                  value={newBehaviorMetricType}
                  onChange={(e) => setNewBehaviorMetricType(e.target.value as BehaviorGoal['metricType'])}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="discipline_trades">Jumlah Trade Disiplin (Ikut Rules)</option>
                  <option value="win_rate">Target Win Rate (%)</option>
                  <option value="emotional_streak">Streak Emosi Positif (Hari)</option>
                  <option value="total_trades">Total Trade Tercatat</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Target Angka</label>
                  <Input
                    type="number"
                    placeholder="Contoh: 20 atau 70"
                    value={newBehaviorTargetValue}
                    onChange={(e) => setNewBehaviorTargetValue(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-foreground">Deadline (Opsional)</label>
                  <Input
                    type="text"
                    placeholder="Contoh: 31 Mei 2026"
                    value={newBehaviorDeadline}
                    onChange={(e) => setNewBehaviorDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" type="button" size="sm" onClick={() => setIsAddBehaviorModalOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" type="submit" size="sm" className="font-bold">
                  Simpan Target
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CompoundingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      }
    >
      <CompoundingContent />
    </Suspense>
  )
}
