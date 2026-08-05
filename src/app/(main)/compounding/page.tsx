'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calculator,
  Plus,
  TrendingUp,
  Target,
  ShieldCheck,
  ChevronRight,
  Crown,
  Loader2,
  RefreshCw,
  Sparkles,
  FileText,
  AlertCircle
} from 'lucide-react'
import { CompoundingQuickActions } from '@/components/shared/compounding-quick-actions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PlanItem {
  id: string
  name: string
  source: string
  initial_modal: number
  profit_plan_percent: number
  risk_plan_percent: number
  pip_risk: number
  pip_value_per_lot: number
  goal_level_target: number
  rules_notes: string
  is_active: boolean
  is_archived: boolean
  status: string
  current_level: number
  current_balance: number
  target_asset_level: number
  levels_count: number
}

export default function CompoundingListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<'active' | 'archived'>('active')
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null)

  const { data: plansData, isLoading, isError, refetch } = useQuery({
    queryKey: ['compounding-plans-list', tab],
    queryFn: async () => {
      const res = await fetch(`/api/compounding?include_archived=true`)
      if (!res.ok) throw new Error('Gagal memuat plan compounding')
      const json = await res.json()
      return json.plans as PlanItem[]
    },
    staleTime: 30_000,
  })

  // Quick Action Mutations
  const setActiveMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/compounding/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true }),
      })
      if (!res.ok) throw new Error('Gagal mengubah status aktif')
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
      const res = await fetch(`/api/compounding/${planId}/duplicate`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Gagal menduplikasi plan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/compounding/${planId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Gagal menghapus plan')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compounding-plans-list'] })
    },
  })

  const filteredPlans = (plansData || []).filter((p) =>
    tab === 'archived' ? p.is_archived : !p.is_archived
  )

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2 tracking-tight">
            <Calculator className="h-7 w-7 text-amber-500" />
            <span>Kalkulator &amp; Peta Jalan Compounding</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Position sizing terukur &amp; proyeksi compounding pertumbuhan modal bertahap
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Link
            href="/compounding/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer w-fit"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Plan Baru</span>
          </Link>
        </div>
      </div>

      {/* Tabs Filter: Active vs Archived */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              tab === 'active'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Plan Aktif ({ (plansData || []).filter(p => !p.is_archived).length })
          </button>
          <button
            type="button"
            onClick={() => setTab('archived')}
            className={cn(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
              tab === 'archived'
                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
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
          {Array.from({ length: 3 }).map((_, i) => (
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
        <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Calculator className="h-7 w-7 text-amber-500" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {tab === 'archived' ? 'Tidak Ada Plan Terarsip' : 'Belum Ada Plan Compounding'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {tab === 'archived'
                ? 'Anda belum memiliki plan compounding yang diarsipkan.'
                : 'Buat plan compounding pertama Anda untuk menghitung lot & target pertumbuhan bertahap.'}
            </p>
          </div>
          {tab === 'active' && (
            <Link
              href="/compounding/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Buat Plan Pertama</span>
            </Link>
          )}
        </div>
      )}

      {/* Plans List */}
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
                  'group bg-card border rounded-2xl p-5 md:p-6 transition-all shadow-sm relative overflow-hidden cursor-pointer hover:border-amber-500/60',
                  plan.is_active
                    ? 'border-amber-500/70 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-md shadow-amber-500/10'
                    : 'border-border'
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-extrabold text-base text-foreground group-hover:text-amber-500 transition-colors">
                        {plan.name}
                      </h2>
                      {plan.is_active && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black shadow-sm flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          <span>Plan Utama Aktif</span>
                        </span>
                      )}
                      {plan.is_archived && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                          Arsip
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <span>Sumber Modal:</span>
                      <span className="font-semibold text-foreground font-mono">{plan.source}</span>
                    </p>

                    {plan.rules_notes && (
                      <p className="text-xs text-amber-400/90 italic bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl line-clamp-1 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span>Rules: {plan.rules_notes}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Progres Level</span>
                      <span className="text-sm font-extrabold text-foreground font-mono">
                        Level {plan.current_level} <span className="text-muted-foreground text-xs font-normal">/ {plan.goal_level_target}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Target Asset Level Ini</span>
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

                    <div className="p-2 rounded-xl bg-muted/40 text-muted-foreground group-hover:text-amber-500 group-hover:bg-amber-500/10 transition-colors">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                {/* Progress Bar Visual (Current Balance vs Target) */}
                <div className="mt-4 pt-3 border-t border-border/50 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-semibold">
                    <span className="text-muted-foreground flex items-center gap-1 font-mono">
                      💰 Saldo Saat Ini: <strong className="text-foreground font-bold">${currentBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {progress.toFixed(0)}% menuju Level {plan.current_level + 1}
                    </span>
                  </div>

                  <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden p-0.5 border border-border/40">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Quick Metrics Bar */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1 font-mono">
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-sans uppercase">Modal Awal</span>
                    <span className="font-bold text-foreground">${plan.initial_modal.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-sans uppercase">Profit / Risk Plan</span>
                    <span className="font-bold text-foreground">{plan.profit_plan_percent}% / {plan.risk_plan_percent}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-sans uppercase">Pip Risk</span>
                    <span className="font-bold text-foreground">{plan.pip_risk} Pips</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block font-sans uppercase">Risk-Reward Ratio</span>
                    <span className="font-extrabold text-amber-400">RR 1:{(plan.profit_plan_percent / plan.risk_plan_percent).toFixed(1)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
