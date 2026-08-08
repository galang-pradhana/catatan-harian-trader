'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  TrendingUp,
  Brain,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Loader2,
  Check,
  Upload,
  AlertTriangle
} from 'lucide-react'
import { Trade, SelfGrade, MoodType } from '@/types/trade'
import { analyzeTradeExit, computeTradeActualRR } from '@/utils/trade-metrics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'

interface TradeJournalDrawerProps {
  isOpen: boolean
  tradeId: string | null // null for new manual trade entry
  tradesList?: Trade[]
  onClose: () => void
  onSaved?: () => void
  onSelectTrade?: (id: string) => void
}

async function fetchTradeDetail(id: string) {
  const res = await fetch(`/api/trades/${id}`)
  if (!res.ok) throw new Error('Trade tidak ditemukan')
  const json = await res.json()
  return json.trade
}

async function fetchStrategies() {
  const res = await fetch('/api/strategies')
  if (!res.ok) return []
  const json = await res.json()
  return json.strategies ?? []
}

async function fetchMistakeTags() {
  const res = await fetch('/api/mistake-tags')
  if (!res.ok) return []
  const json = await res.json()
  return json.mistake_tags ?? []
}

async function saveJournalApi(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/trades/${id}/journal`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Gagal menyimpan jurnal')
  }
  return res.json()
}

async function createManualTradeApi(payload: Record<string, unknown>) {
  const res = await fetch('/api/trades', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Gagal menambah trade manual')
  }
  const json = await res.json()
  return json.trade
}

async function uploadScreenshotApi(tradeId: string, file: File, type: 'entry' | 'exit') {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  const res = await fetch(`/api/trades/${tradeId}/screenshots`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Gagal upload screenshot')
  }
  return res.json()
}

async function createStrategyApi(name: string) {
  const res = await fetch('/api/strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color: '#D4A94C' }),
  })
  if (!res.ok) throw new Error('Gagal menambah strategi')
  const json = await res.json()
  return json.strategy
}

async function createMistakeTagApi(name: string) {
  const res = await fetch('/api/mistake-tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color: '#EF4444' }),
  })
  if (!res.ok) throw new Error('Gagal menambah tag kesalahan')
  const json = await res.json()
  return json.mistake_tag
}

const moodOptions: Array<{ type: MoodType; label: string; emoji: string }> = [
  { type: 'confident', label: 'Percaya Diri', emoji: '😊' },
  { type: 'neutral', label: 'Netral', emoji: '😐' },
  { type: 'fomo', label: 'FOMO', emoji: '😤' },
  { type: 'anxious', label: 'Cemas', emoji: '😰' },
  { type: 'greedy', label: 'Serakah', emoji: '🤑' },
]

export function TradeJournalDrawer({
  isOpen,
  tradeId,
  tradesList = [],
  onClose,
  onSaved,
  onSelectTrade,
}: TradeJournalDrawerProps) {
  const queryClient = useQueryClient()
  const isManualMode = tradeId === null

  // Collapsible Section States
  const [section1Open, setSection1Open] = useState(true)
  const [section2Open, setSection2Open] = useState(true)
  const [section3Open, setSection3Open] = useState(true)

  // Unsaved changes warning modal state
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [pendingNextTradeId, setPendingNextTradeId] = useState<string | null>(null)

  // Inline Modal States for Strategies / Tags
  const [isAddStrategyOpen, setIsAddStrategyOpen] = useState(false)
  const [newStrategyName, setNewStrategyName] = useState('')
  const [isAddTagOpen, setIsAddTagOpen] = useState(false)
  const [newTagName, setNewTagName] = useState('')

  // Manual Trade Fields (Section 1 for new manual trade)
  const [manualSymbol, setManualSymbol] = useState('EURUSD')
  const [manualDirection, setManualDirection] = useState<'buy' | 'sell'>('buy')
  const [manualVolume, setManualVolume] = useState('0.10')
  const [manualOpenPrice, setManualOpenPrice] = useState('')
  const [manualClosePrice, setManualClosePrice] = useState('')
  const [manualOpenTime, setManualOpenTime] = useState(() => {
    const now = new Date()
    return now.toISOString().slice(0, 16)
  })
  const [manualSession, setManualSession] = useState<'asia' | 'london' | 'newyork'>('london')

  // Journal Form State (Section 1-3)
  const [reasonEntry, setReasonEntry] = useState('')
  const [mood, setMood] = useState<MoodType | undefined>()
  const [discipline, setDiscipline] = useState<'yes' | 'no' | undefined>()
  const [lessonLearned, setLessonLearned] = useState('')
  const [riskPercent, setRiskPercent] = useState<number | undefined>()
  const [plannedRR, setPlannedRR] = useState<number | undefined>()
  const [actualRR, setActualRR] = useState<number | undefined>()
  const [selfGrade, setSelfGrade] = useState<SelfGrade | undefined>()
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([])
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([])
  const [editSl, setEditSl] = useState<string>('')
  const [editTp, setEditTp] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)

  // Fetch Existing Trade Detail
  const { data: trade, isLoading: isTradeLoading, isError } = useQuery({
    queryKey: ['trade-detail-drawer', tradeId],
    queryFn: () => (tradeId ? fetchTradeDetail(tradeId) : null),
    enabled: isOpen && !!tradeId,
    staleTime: 10_000,
  })

  const { data: strategies = [], refetch: refetchStrats } = useQuery({
    queryKey: ['strategies'],
    queryFn: fetchStrategies,
    enabled: isOpen,
    staleTime: 60_000,
  })

  const { data: mistakeTags = [], refetch: refetchTags } = useQuery({
    queryKey: ['mistake-tags'],
    queryFn: fetchMistakeTags,
    enabled: isOpen,
    staleTime: 60_000,
  })

  // Reset form when drawer opens or tradeId changes
  useEffect(() => {
    if (isOpen) {
      setIsDirty(false)
      setShowExitConfirm(false)
      setPendingNextTradeId(null)

      if (isManualMode) {
        setManualSymbol('EURUSD')
        setManualDirection('buy')
        setManualVolume('0.10')
        setManualOpenPrice('')
        setManualClosePrice('')
        setManualOpenTime(new Date().toISOString().slice(0, 16))
        setManualSession('london')
        setReasonEntry('')
        setMood(undefined)
        setDiscipline(undefined)
        setLessonLearned('')
        setRiskPercent(undefined)
        setPlannedRR(undefined)
        setActualRR(undefined)
        setSelfGrade(undefined)
        setSelectedStrategies([])
        setSelectedMistakes([])
        setEditSl('')
        setEditTp('')
      } else if (trade) {
        setEditSl(trade.sl ? String(trade.sl) : '')
        setEditTp(trade.tp ? String(trade.tp) : '')
        const j = trade.trade_journal
        const autoComputedRR = computeTradeActualRR(trade)
        if (j) {
          setReasonEntry(j.reason_entry || '')
          setMood(j.mood)
          setDiscipline(j.discipline)
          setLessonLearned(j.lesson_learned || '')
          setRiskPercent(j.risk_percent)
          setPlannedRR(j.planned_rr)
          setActualRR(j.actual_rr ?? (autoComputedRR !== null ? autoComputedRR : undefined))
          setSelfGrade(j.self_grade)
        } else {
          setReasonEntry('')
          setMood(undefined)
          setDiscipline(undefined)
          setLessonLearned('')
          setRiskPercent(undefined)
          setPlannedRR(undefined)
          setActualRR(autoComputedRR !== null ? autoComputedRR : undefined)
          setSelfGrade(undefined)
        }
        setSelectedStrategies((trade.strategies ?? []).map((s: { id: string }) => s.id))
        setSelectedMistakes((trade.mistakes ?? []).map((m: { id: string }) => m.id))
      }
    }
  }, [isOpen, tradeId, trade, isManualMode])

  // Track Form Changes (Dirty Flag)
  const markDirty = () => {
    if (!isDirty) setIsDirty(true)
  }

  // Calculate Trade Index in List for Prev/Next Navigation
  const currentIndex = useMemo(() => {
    if (!tradeId || tradesList.length === 0) return -1
    return tradesList.findIndex((t) => t.id === tradeId)
  }, [tradeId, tradesList])

  const prevTrade = useMemo(() => {
    if (currentIndex <= 0) return null
    return tradesList[currentIndex - 1]
  }, [currentIndex, tradesList])

  const nextTrade = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= tradesList.length - 1) return null
    return tradesList[currentIndex + 1]
  }, [currentIndex, tradesList])

  // Form Completeness Math (Progress Bar)
  const completeness = useMemo(() => {
    let filled = 0
    const totalFields = 8
    if (isManualMode ? manualOpenPrice : editSl) filled++
    if (isManualMode ? manualClosePrice : editTp) filled++
    if (reasonEntry) filled++
    if (mood) filled++
    if (discipline) filled++
    if (selectedStrategies.length > 0) filled++
    if (lessonLearned) filled++
    if (selfGrade) filled++

    const percentage = Math.round((filled / totalFields) * 100)
    return { filled, totalFields, percentage }
  }, [isManualMode, manualOpenPrice, manualClosePrice, editSl, editTp, reasonEntry, mood, discipline, selectedStrategies, lessonLearned, selfGrade])

  // Save Mutations
  const saveJournalMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      return saveJournalApi(id, payload)
    },
    onSuccess: () => {
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ['trade', tradeId] })
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['trade-detail-drawer'] })
      if (onSaved) onSaved()
    },
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: 'entry' | 'exit' }) => {
      if (!tradeId) throw new Error('Simpan trade manual terlebih dahulu sebelum upload screenshot')
      return uploadScreenshotApi(tradeId, file, type)
    },
    onSuccess: () => {
      toast('Screenshot berhasil diupload!', 'success')
      queryClient.invalidateQueries({ queryKey: ['trade-detail-drawer', tradeId] })
      queryClient.invalidateQueries({ queryKey: ['trade', tradeId] })
    },
    onError: (err: Error) => {
      toast(err.message || 'Gagal upload screenshot', 'error')
    },
  })

  const addStrategyMutation = useMutation({
    mutationFn: (name: string) => createStrategyApi(name),
    onSuccess: (newStrat) => {
      toast(`Strategi "${newStrat.name}" ditambahkan!`, 'success')
      refetchStrats()
      setSelectedStrategies((prev) => [...prev, newStrat.id])
      setNewStrategyName('')
      setIsAddStrategyOpen(false)
      markDirty()
    },
  })

  const addTagMutation = useMutation({
    mutationFn: (name: string) => createMistakeTagApi(name),
    onSuccess: (newTag) => {
      toast(`Tag kesalahan "${newTag.name}" ditambahkan!`, 'success')
      refetchTags()
      setSelectedMistakes((prev) => [...prev, newTag.id])
      setNewTagName('')
      setIsAddTagOpen(false)
      markDirty()
    },
  })

  // Handle Close Attempt (Checks Dirty)
  const handleAttemptClose = useCallback(() => {
    if (isDirty) {
      setShowExitConfirm(true)
    } else {
      onClose()
    }
  }, [isDirty, onClose])

  // Handle Esc Key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        handleAttemptClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleAttemptClose])

  // Navigation Click Handler (Checks Dirty)
  const handleNavigateTrade = (targetId: string) => {
    if (isDirty) {
      setPendingNextTradeId(targetId)
      setShowExitConfirm(true)
    } else if (onSelectTrade) {
      onSelectTrade(targetId)
    }
  }

  // Core Save Logic
  const executeSave = async (andContinue: boolean = false) => {
    try {
      let targetId = tradeId

      // Case A: Create Manual Trade First if new
      if (isManualMode) {
        if (!manualSymbol || !manualOpenPrice || !manualOpenTime) {
          toast('Symbol, Harga Entry, dan Tanggal wajib diisi!', 'error')
          return
        }

        const newTradeObj = await createManualTradeApi({
          symbol: manualSymbol,
          direction: manualDirection,
          volume: Number(manualVolume),
          open_price: Number(manualOpenPrice),
          close_price: manualClosePrice ? Number(manualClosePrice) : null,
          open_time: manualOpenTime,
          sl: editSl ? Number(editSl) : null,
          tp: editTp ? Number(editTp) : null,
          session: manualSession,
        })

        targetId = newTradeObj.id
      }

      if (!targetId) throw new Error('ID Trade tidak valid')

      // Case B: Save Journal Details
      await saveJournalMutation.mutateAsync({
        id: targetId,
        payload: {
          sl: editSl ? Number(editSl) : null,
          tp: editTp ? Number(editTp) : null,
          reason_entry: reasonEntry || undefined,
          mood: mood || undefined,
          discipline: discipline || undefined,
          lesson_learned: lessonLearned || undefined,
          risk_percent: riskPercent,
          planned_rr: plannedRR,
          actual_rr: actualRR,
          self_grade: selfGrade || undefined,
          strategy_ids: selectedStrategies,
          mistake_tag_ids: selectedMistakes,
        },
      })

      toast('Jurnal trade berhasil disimpan!', 'success')
      setIsDirty(false)

      if (andContinue) {
        // Find next incomplete trade in tradesList
        const nextIncomplete = tradesList.find(
          (t, idx) => idx > currentIndex && t.journalStatus === 'incomplete'
        ) || tradesList.find((t) => t.journalStatus === 'incomplete' && t.id !== targetId)

        if (nextIncomplete && onSelectTrade) {
          toast(`Membuka jurnal berikutnya #${nextIncomplete.mt5TicketId}`, 'info')
          onSelectTrade(nextIncomplete.id)
        } else {
          toast('Semua jurnal trade terfilter sudah lengkap!', 'success')
          onClose()
        }
      } else {
        onClose()
      }
    } catch (err: any) {
      toast(err?.message || 'Gagal menyimpan jurnal', 'error')
    }
  }

  if (!isOpen) return null

  const isBuy = isManualMode ? manualDirection === 'buy' : (trade?.direction === 'buy')
  const openP = isManualMode ? Number(manualOpenPrice || 0) : (trade?.openPrice ?? trade?.open_price)
  const closeP = isManualMode ? (manualClosePrice ? Number(manualClosePrice) : null) : (trade?.closePrice ?? trade?.close_price)
  const slP = editSl ? Number(editSl) : (trade?.sl ?? null)
  const tpP = editTp ? Number(editTp) : (trade?.tp ?? null)
  const pnlVal = isManualMode
    ? (manualClosePrice && manualOpenPrice ? (manualDirection === 'buy' ? Number(manualClosePrice) - Number(manualOpenPrice) : Number(manualOpenPrice) - Number(manualClosePrice)) * Number(manualVolume || 0.1) * 100 : undefined)
    : (trade?.pnl ?? undefined)

  const isProfit = (pnlVal || 0) >= 0
  const exitInfo = analyzeTradeExit({
    direction: isBuy ? 'buy' : 'sell',
    open_price: openP || 0,
    close_price: closeP ?? null,
    sl: slP,
    tp: tpP,
    pnl: pnlVal ?? null,
    status: closeP ? 'closed' : 'open',
  })

  // Horizontal Gauge level percentage math for SL - Entry - TP
  let actualMarkerPct = 50
  if (slP && tpP && slP !== tpP && openP) {
    const activePrice = closeP ?? openP
    if (isBuy) {
      actualMarkerPct = Math.min(100, Math.max(0, ((activePrice - slP) / (tpP - slP)) * 100))
    } else {
      actualMarkerPct = Math.min(100, Math.max(0, ((slP - activePrice) / (slP - tpP)) * 100))
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Overlay */}
      <div
        onClick={handleAttemptClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Panel (Desktop Right 560px, Mobile Bottom Sheet) */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full md:max-w-[560px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* ========================================================================= */}
        {/* 📌 STICKY HEADER */}
        {/* ========================================================================= */}
        <div className="sticky top-0 z-20 bg-card/95 border-b border-border/80 p-4 backdrop-blur-md space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Title & Ticket */}
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-extrabold text-foreground tracking-tight truncate">
                {isManualMode
                  ? '+ Tambah Jurnal Trade (Manual)'
                  : `Jurnal #${trade?.mt5TicketId || trade?.mt5_ticket_id} (${trade?.symbol})`}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                {completeness.filled}/{completeness.totalFields} Terisi ({completeness.percentage}%)
              </span>
            </div>

            {/* Prev/Next & Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isManualMode && (
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!prevTrade}
                    onClick={() => prevTrade && handleNavigateTrade(prevTrade.id)}
                    title="Trade Sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={!nextTrade}
                    onClick={() => nextTrade && handleNavigateTrade(nextTrade.id)}
                    title="Trade Berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={handleAttemptClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Progress bar line */}
          <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${completeness.percentage}%` }}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 📜 DRAWER BODY (SCROLLABLE FORM) */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isTradeLoading && !isManualMode ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Memuat detail trade...</p>
            </div>
          ) : (
            <>
              {/* SECTION 1: DATA PERDAGANGAN */}
              <div className="bg-card/70 border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4">
                <div
                  onClick={() => setSection1Open(!section1Open)}
                  className="flex items-center justify-between border-b border-border/60 pb-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-muted text-foreground">
                      <BarChart3 className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">1. Data Perdagangan</h3>
                      <p className="text-[11px] text-muted-foreground">
                        {isManualMode ? 'Input manual parameter harga & waktu' : 'Data eksekusi dari MT5'}
                      </p>
                    </div>
                  </div>
                </div>

                {section1Open && (
                  <div className="space-y-4">
                    {/* If Manual Mode -> Full Editable Fields */}
                    {isManualMode ? (
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-bold text-muted-foreground block mb-1">Pair / Symbol</label>
                            <Input
                              value={manualSymbol}
                              onChange={(e) => { setManualSymbol(e.target.value.toUpperCase()); markDirty() }}
                              placeholder="EURUSD / XAUUSD"
                              className="font-bold uppercase"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-muted-foreground block mb-1">Arah (Buy / Sell)</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => { setManualDirection('buy'); markDirty() }}
                                className={cn(
                                  'flex-1 py-2 rounded-xl font-bold border transition-all',
                                  manualDirection === 'buy'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                    : 'bg-muted/40 border-border text-muted-foreground'
                                )}
                              >
                                BUY
                              </button>
                              <button
                                type="button"
                                onClick={() => { setManualDirection('sell'); markDirty() }}
                                className={cn(
                                  'flex-1 py-2 rounded-xl font-bold border transition-all',
                                  manualDirection === 'sell'
                                    ? 'bg-destructive/20 text-destructive border-destructive/40'
                                    : 'bg-muted/40 border-border text-muted-foreground'
                                )}
                              >
                                SELL
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="font-bold text-muted-foreground block mb-1">Volume (Lot)</label>
                            <Input
                              type="number"
                              step="0.01"
                              value={manualVolume}
                              onChange={(e) => { setManualVolume(e.target.value); markDirty() }}
                              placeholder="0.10"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-muted-foreground block mb-1">Harga Entry</label>
                            <Input
                              type="number"
                              step="any"
                              value={manualOpenPrice}
                              onChange={(e) => { setManualOpenPrice(e.target.value); markDirty() }}
                              placeholder="1.0850"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-muted-foreground block mb-1">Harga Exit</label>
                            <Input
                              type="number"
                              step="any"
                              value={manualClosePrice}
                              onChange={(e) => { setManualClosePrice(e.target.value); markDirty() }}
                              placeholder="1.0900"
                            />
                          </div>

                          <div>
                            <label className="font-bold text-muted-foreground block mb-1">Sesi</label>
                            <select
                              value={manualSession}
                              onChange={(e) => { setManualSession(e.target.value as any); markDirty() }}
                              className="w-full h-9 rounded-xl bg-background border border-border px-2 text-xs font-semibold"
                            >
                              <option value="asia">Asia</option>
                              <option value="london">London</option>
                              <option value="newyork">New York</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-muted-foreground block mb-1">Waktu Entry</label>
                          <Input
                            type="datetime-local"
                            value={manualOpenTime}
                            onChange={(e) => { setManualOpenTime(e.target.value); markDirty() }}
                          />
                        </div>
                      </div>
                    ) : (
                      /* Read-Only MT5 Executed Summary */
                      <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
                              isBuy
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-destructive/15 text-destructive border border-destructive/30'
                            )}
                          >
                            {isBuy ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-foreground text-sm">{trade?.symbol}</span>
                              <span className={cn('text-[10px] font-bold uppercase px-1.5 py-0.5 rounded', isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive')}>
                                {trade?.direction}
                              </span>
                              <span className="text-xs font-mono text-muted-foreground">{trade?.volume} Lot</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Entry: <span className="font-mono text-foreground">{trade?.openPrice ?? trade?.open_price}</span> • Exit: <span className="font-mono text-foreground">{trade?.closePrice ?? trade?.close_price ?? 'Running'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block uppercase font-semibold">PnL</span>
                          <span className={`font-mono text-base font-extrabold ${isProfit ? 'text-emerald-400' : 'text-destructive'}`}>
                            {pnlVal !== undefined ? `${isProfit ? '+' : ''}$${pnlVal.toFixed(2)}` : 'Running'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Editable SL & TP */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Stop Loss (SL)</label>
                        <Input
                          type="number"
                          step="any"
                          value={editSl}
                          onChange={(e) => { setEditSl(e.target.value); markDirty() }}
                          placeholder="Contoh: 1.0850"
                          className="font-mono text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Take Profit (TP)</label>
                        <Input
                          type="number"
                          step="any"
                          value={editTp}
                          onChange={(e) => { setEditTp(e.target.value); markDirty() }}
                          placeholder="Contoh: 1.0950"
                          className="font-mono text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: ANALISIS RISK:REWARD GAUGE */}
              <div className="bg-gradient-to-br from-card via-card to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
                <div
                  onClick={() => setSection2Open(!section2Open)}
                  className="flex items-center justify-between border-b border-border/60 pb-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">2. Analisis Risk:Reward</h3>
                      <p className="text-[11px] text-muted-foreground">Planned vs Actual R:R &amp; Risk %</p>
                    </div>
                  </div>
                </div>

                {section2Open && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-card border border-border space-y-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Planned R:R</span>
                        <span className="font-mono font-bold text-xs text-amber-400">
                          {exitInfo.plannedRR !== '-' ? `1:${exitInfo.plannedRR}` : '-'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border space-y-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Eksekusi Exit</span>
                        <span className={cn('font-bold text-[10px] px-2 py-0.5 rounded-full border inline-block', exitInfo.exitBadgeColor)}>
                          {exitInfo.exitTypeLabel}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border space-y-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Risk % Account</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={riskPercent ?? ''}
                          onChange={(e) => { setRiskPercent(e.target.value ? Number(e.target.value) : undefined); markDirty() }}
                          placeholder="1.0"
                          className="font-mono text-xs h-6 w-full"
                        />
                      </div>
                    </div>

                    {/* Horizontal R:R Gauge */}
                    <div className="p-3.5 rounded-xl bg-card border border-border space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                        <span className="text-destructive">🔴 SL: {slP ?? '-'}</span>
                        <span className="text-foreground">⚪ Entry: {openP || '-'}</span>
                        <span className="text-emerald-400">🟢 TP: {tpP ?? '-'}</span>
                      </div>

                      <div className="relative w-full h-3 bg-muted/60 rounded-full overflow-hidden flex">
                        <div className="w-1/2 h-full bg-destructive/30 border-r border-background" />
                        <div className="w-1/2 h-full bg-emerald-500/30" />
                        <div
                          className="absolute top-0 bottom-0 w-2 bg-amber-400 rounded-full shadow-md -ml-1 transition-all duration-300"
                          style={{ left: `${actualMarkerPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: REFLEKSI & JURNAL KUALITATIF */}
              <div className="bg-gradient-to-br from-card via-card to-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
                <div
                  onClick={() => setSection3Open(!section3Open)}
                  className="flex items-center justify-between border-b border-border/60 pb-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Brain className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-foreground">3. Refleksi &amp; Jurnal Kualitatif</h3>
                      <p className="text-[11px] text-muted-foreground">Emosi, kedisiplinan, strategi &amp; mistake tags</p>
                    </div>
                  </div>
                </div>

                {section3Open && (
                  <div className="space-y-4 text-xs">
                    {/* Mood */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-foreground block">Emosi Saat Entry</label>
                      <div className="flex flex-wrap gap-1.5">
                        {moodOptions.map((m) => (
                          <button
                            key={m.type}
                            type="button"
                            onClick={() => { setMood(m.type); markDirty() }}
                            className={cn(
                              'px-2.5 py-1 rounded-xl font-bold border transition-all flex items-center gap-1 cursor-pointer text-[11px]',
                              mood === m.type
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-xs'
                                : 'bg-card border-border text-muted-foreground hover:bg-muted/30'
                            )}
                          >
                            <span>{m.emoji}</span>
                            <span>{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Discipline */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-foreground block">Kedisiplinan</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setDiscipline('yes'); markDirty() }}
                          className={cn(
                            'flex-1 py-1.5 px-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1 text-[11px]',
                            discipline === 'yes'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                              : 'bg-card border-border text-muted-foreground'
                          )}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Ikut Rules</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setDiscipline('no'); markDirty() }}
                          className={cn(
                            'flex-1 py-1.5 px-2 rounded-xl font-bold border transition-all flex items-center justify-center gap-1 text-[11px]',
                            discipline === 'no'
                              ? 'bg-destructive/20 text-destructive border-destructive/50'
                              : 'bg-card border-border text-muted-foreground'
                          )}
                        >
                          <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                          <span>Melanggar Rules</span>
                        </button>
                      </div>
                    </div>

                    {/* Strategi */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-foreground">Strategi Digunakan</label>
                        <button
                          type="button"
                          onClick={() => setIsAddStrategyOpen(true)}
                          className="text-[10px] font-bold text-amber-500 hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="h-3 w-3" /> Tambah
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {strategies.map((s: any) => {
                          const isSel = selectedStrategies.includes(s.id)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setSelectedStrategies((prev) =>
                                  prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                                )
                                markDirty()
                              }}
                              className={cn(
                                'px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-all',
                                isSel
                                  ? 'bg-amber-500 text-black border-amber-500 font-bold'
                                  : 'bg-card border-border text-muted-foreground hover:bg-muted/30'
                              )}
                            >
                              {s.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Mistake Tags */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-foreground">Tag Kesalahan</label>
                        <button
                          type="button"
                          onClick={() => setIsAddTagOpen(true)}
                          className="text-[10px] font-bold text-destructive hover:underline flex items-center gap-0.5"
                        >
                          <Plus className="h-3 w-3" /> Tambah
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mistakeTags.map((m: any) => {
                          const isSel = selectedMistakes.includes(m.id)
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedMistakes((prev) =>
                                  prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]
                                )
                                markDirty()
                              }}
                              className={cn(
                                'px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-all',
                                isSel
                                  ? 'bg-destructive text-white border-destructive font-bold'
                                  : 'bg-card border-border text-muted-foreground hover:bg-muted/30'
                              )}
                            >
                              {m.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Textareas */}
                    <div className="space-y-1.5">
                      <label className="font-bold text-foreground block">Alasan Entry</label>
                      <textarea
                        rows={2}
                        value={reasonEntry}
                        onChange={(e) => { setReasonEntry(e.target.value); markDirty() }}
                        placeholder="Alasan teknikal/fundamental entry..."
                        className="w-full bg-background border border-border rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-foreground block">Pelajaran &amp; Refleksi</label>
                      <textarea
                        rows={2}
                        value={lessonLearned}
                        onChange={(e) => { setLessonLearned(e.target.value); markDirty() }}
                        placeholder="Pelajaran atau hal yang perlu dievaluasi..."
                        className="w-full bg-background border border-border rounded-xl p-2 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 📌 STICKY FOOTER (ACTIONS) */}
        {/* ========================================================================= */}
        <div className="sticky bottom-0 z-20 bg-card/95 border-t border-border/80 p-4 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleAttemptClose}>
            Batal
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={saveJournalMutation.isPending}
              onClick={() => executeSave(false)}
              className="text-xs font-bold border-border hover:bg-muted"
            >
              {saveJournalMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Simpan
            </Button>

            <Button
              size="sm"
              disabled={saveJournalMutation.isPending}
              onClick={() => executeSave(true)}
              className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md"
            >
              {saveJournalMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
              Simpan &amp; Lanjut →
            </Button>
          </div>
        </div>
      </aside>

      {/* Unsaved Changes Confirmation Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="font-extrabold text-sm text-foreground">Perubahan Belum Disimpan</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Ada perubahan jurnal yang belum Anda simpan. Yakin ingin keluar tanpa menyimpan?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowExitConfirm(false)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setShowExitConfirm(false)
                  setIsDirty(false)
                  if (pendingNextTradeId && onSelectTrade) {
                    onSelectTrade(pendingNextTradeId)
                    setPendingNextTradeId(null)
                  } else {
                    onClose()
                  }
                }}
              >
                Ya, Keluar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
