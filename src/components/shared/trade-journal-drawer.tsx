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
  AlertTriangle,
  Layers,
  Link2
} from 'lucide-react'
import { Trade, SelfGrade, MoodType } from '@/types/trade'
import { analyzeTradeExit, computeTradeActualRR } from '@/utils/trade-metrics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'
import { getEmotionByKey, EMOTION_TAXONOMY, EMOTION_CATEGORY_DEFS } from '@/constants/psychology'
import { EmotionCategoryKey } from '@/types/psychology'

interface TradeJournalDrawerProps {
  isOpen: boolean
  tradeId: string | null // null for new manual trade entry or batch mode
  batchTrades?: Trade[] // when provided & non-empty, opens in BATCH MODE
  initialGroupId?: string
  initialGroupName?: string
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

async function saveBatchJournalApi(payload: Record<string, unknown>) {
  const res = await fetch('/api/trades/batch-journal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Gagal menyimpan jurnal bersama')
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

async function createStrategyApi(name: string, color = '#D4A94C') {
  const res = await fetch('/api/strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Gagal menambah strategi')
  }
  const json = await res.json()
  return json.strategy
}

async function createMistakeTagApi(name: string, color = '#EF4444') {
  const res = await fetch('/api/mistake-tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Gagal menambah tag kesalahan')
  }
  const json = await res.json()
  return json.mistake_tag
}

export function TradeJournalDrawer({
  isOpen,
  tradeId,
  batchTrades = [],
  initialGroupId,
  initialGroupName,
  tradesList = [],
  onClose,
  onSaved,
  onSelectTrade,
}: TradeJournalDrawerProps) {
  const queryClient = useQueryClient()
  const isBatchMode = Boolean(batchTrades && batchTrades.length > 0)
  const isManualMode = !isBatchMode && tradeId === null

  // Group State for Batch Mode
  const [groupId, setGroupId] = useState<string>('')
  const [groupName, setGroupName] = useState<string>('')

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

  // Fetch Existing Trade Detail (Single Trade Mode)
  const { data: trade, isLoading: isTradeLoading } = useQuery({
    queryKey: ['trade-detail-drawer', tradeId],
    queryFn: () => (tradeId && !isBatchMode ? fetchTradeDetail(tradeId) : null),
    enabled: isOpen && !!tradeId && !isBatchMode,
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

  // Reset form when drawer opens or mode/trade changes
  useEffect(() => {
    if (isOpen) {
      setIsDirty(false)
      setShowExitConfirm(false)
      setPendingNextTradeId(null)

      if (isBatchMode) {
        const firstTrade = batchTrades[0]
        setGroupId(initialGroupId || firstTrade?.groupId || '')
        setGroupName(initialGroupName || firstTrade?.groupName || '')

        // Pre-fill qualitative fields if available from first trade
        const j = firstTrade?.journal
        setReasonEntry(j?.reasonEntry || '')
        setMood(j?.mood)
        setDiscipline(j?.discipline)
        setLessonLearned(j?.lessonLearned || '')
        setRiskPercent(j?.riskPercent)
        setPlannedRR(j?.plannedRR)
        setActualRR(j?.actualRR)
        setSelfGrade(j?.selfGrade)
        setSelectedStrategies((j?.strategies ?? []).map((s) => s.id))
        setSelectedMistakes((j?.mistakes ?? []).map((m) => m.id))
        setEditSl('')
        setEditTp('')
      } else if (isManualMode) {
        setGroupId('')
        setGroupName('')
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
        setGroupId(trade.groupId || trade.trade_journal?.group_id || '')
        setGroupName(trade.groupName || trade.trade_journal?.group_name || '')
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
  }, [isOpen, tradeId, isBatchMode, batchTrades, isManualMode, trade, initialGroupId, initialGroupName])

  // Track Form Changes (Dirty Flag)
  const markDirty = () => {
    if (!isDirty) setIsDirty(true)
  }

  // Calculate Trade Index in List for Prev/Next Navigation
  const currentIndex = useMemo(() => {
    if (!tradeId || isBatchMode || tradesList.length === 0) return -1
    return tradesList.findIndex((t) => t.id === tradeId)
  }, [tradeId, isBatchMode, tradesList])

  const prevTrade = useMemo(() => {
    if (currentIndex <= 0) return null
    return tradesList[currentIndex - 1]
  }, [currentIndex, tradesList])

  const nextTrade = useMemo(() => {
    if (currentIndex < 0 || currentIndex >= tradesList.length - 1) return null
    return tradesList[currentIndex + 1]
  }, [currentIndex, tradesList])

  const [todayEmotionWarning, setTodayEmotionWarning] = useState<string | null>(null)

  // Fetch today's logged emotion warning when drawer opens
  useEffect(() => {
    if (!isOpen) return
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayMonth = todayStr.slice(0, 7)

    fetch(`/api/psychology/logs?month=${todayMonth}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.logs)) {
          const todayLog = data.logs.find((l: any) => l.log_date === todayStr)
          if (todayLog) {
            const category = todayLog.category
            if (category === 'impulsive' || category === 'greed') {
              const emoDef = getEmotionByKey(todayLog.emotion)
              setTodayEmotionWarning(
                `⚠️ Kamu menandai emosi ${emoDef.emoji} ${emoDef.label} (${emoDef.categoryLabel}) hari ini. Pastikan entry sesuai trading plan kamu.`
              )
            } else {
              setTodayEmotionWarning(null)
            }
          } else {
            setTodayEmotionWarning(null)
          }
        }
      })
      .catch(() => setTodayEmotionWarning(null))
  }, [isOpen])

  // Form Completeness Math (Progress Bar)
  const completeness = useMemo(() => {
    let filled = 0
    const totalFields = isBatchMode ? 7 : 8
    if (!isBatchMode && (isManualMode ? manualOpenPrice : editSl)) filled++
    if (!isBatchMode && (isManualMode ? manualClosePrice : editTp)) filled++
    if (reasonEntry) filled++
    if (mood) filled++
    if (discipline) filled++
    if (selectedStrategies.length > 0) filled++
    if (lessonLearned) filled++
    if (selfGrade) filled++

    const percentage = Math.round((filled / totalFields) * 100)
    return { filled, totalFields, percentage }
  }, [isBatchMode, isManualMode, manualOpenPrice, manualClosePrice, editSl, editTp, reasonEntry, mood, discipline, selectedStrategies, lessonLearned, selfGrade])

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

  const saveBatchMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return saveBatchJournalApi(payload)
    },
    onSuccess: (data) => {
      toast(`Jurnal berhasil disimpan untuk ${data.updated_count} trade!`, 'success')
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['trade-detail-drawer'] })
      if (onSaved) onSaved()
      onClose()
    },
    onError: (err: Error) => {
      toast(err.message || 'Gagal menyimpan jurnal bersama', 'error')
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
      if (isBatchMode) {
        await saveBatchMutation.mutateAsync({
          trade_ids: batchTrades.map((t) => t.id),
          group_id: groupId || undefined,
          group_name: groupName || undefined,
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
        })
        return
      }

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

      // Case B: Save Single Journal Details
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

  const isSaving = saveJournalMutation.isPending || saveBatchMutation.isPending

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop Overlay */}
      <div
        onClick={handleAttemptClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Panel (Desktop Right 580px, Mobile Bottom Sheet) */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full md:max-w-[580px] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* ========================================================================= */}
        {/* 📌 STICKY HEADER */}
        {/* ========================================================================= */}
        <div className="sticky top-0 z-20 bg-card/95 border-b border-border/80 p-4 backdrop-blur-md space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Title & Ticket */}
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-extrabold text-foreground tracking-tight truncate">
                {isBatchMode
                  ? `🔗 Isi Jurnal Bersama — ${batchTrades.length} Trade`
                  : isManualMode
                  ? '+ Tambah Jurnal Trade (Manual)'
                  : `Jurnal #${trade?.mt5TicketId || trade?.mt5_ticket_id} (${trade?.symbol})`}
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                {completeness.filled}/{completeness.totalFields} Terisi ({completeness.percentage}%)
              </span>
            </div>

            {/* Prev/Next & Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isManualMode && !isBatchMode && (
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
          {/* Soft Warning Banner for Today's Logged Impulsive / Greed Emotion */}
          {todayEmotionWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300 font-semibold shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                <span>{todayEmotionWarning}</span>
              </div>
            </div>
          )}

          {isTradeLoading && !isManualMode && !isBatchMode ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Memuat detail trade...</p>
            </div>
          ) : (
            <>
              {/* Optional Group Name Field (for Batch Mode or Grouped Trades) */}
              {isBatchMode && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-1.5">
                  <label className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-purple-400" />
                    <span>Nama Grup / Sesi (Opsional)</span>
                  </label>
                  <Input
                    value={groupName}
                    onChange={(e) => { setGroupName(e.target.value); markDirty() }}
                    placeholder="Contoh: Breakout pagi XAUUSD — overconfident habis WD"
                    className="text-xs font-semibold bg-background border-purple-500/40 focus:border-purple-400"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Label nama grup memudahkan pencarian &amp; identifikasi kelompok trade ini di daftar riwayat.
                  </p>
                </div>
              )}

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
                      <h3 className="text-sm font-extrabold text-foreground">
                        {isBatchMode ? `1. Ringkasan Eksekusi (${batchTrades.length} Trade)` : '1. Data Perdagangan'}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {isBatchMode
                          ? 'Daftar eksekusi trade individual yang dipilih'
                          : isManualMode
                          ? 'Input manual parameter harga & waktu'
                          : 'Data eksekusi dari MT5'}
                      </p>
                    </div>
                  </div>
                </div>

                {section1Open && (
                  <div className="space-y-4">
                    {/* BATCH MODE: Concise Read-Only Table / List of Selected Trades */}
                    {isBatchMode ? (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {batchTrades.map((bt) => {
                          const btBuy = bt.direction === 'buy'
                          const btProfit = (bt.pnl || 0) >= 0
                          const btPnlText = bt.pnl !== undefined ? `${btProfit ? '+' : ''}$${bt.pnl.toFixed(2)}` : 'Running'

                          return (
                            <div
                              key={bt.id}
                              className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Neutral Buy/Sell Icon */}
                                <div
                                  className={cn(
                                    'h-7 w-7 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0',
                                    btBuy
                                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                  )}
                                >
                                  {btBuy ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-foreground truncate">{bt.symbol}</span>
                                    <span
                                      className={cn(
                                        'text-[9px] font-bold uppercase px-1 py-0.2 rounded',
                                        btBuy ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
                                      )}
                                    >
                                      {bt.direction}
                                    </span>
                                    <span className="text-[10px] font-mono text-muted-foreground">{bt.volume} L</span>
                                    {bt.status !== 'open' && bt.pnl !== undefined && (
                                      <span
                                        className={cn(
                                          'text-[9px] font-black uppercase px-1.5 py-0.2 rounded text-white tracking-wider shrink-0',
                                          bt.pnl > 0 ? 'bg-emerald-600' : bt.pnl < 0 ? 'bg-red-600' : 'bg-slate-600'
                                        )}
                                      >
                                        {bt.pnl > 0 ? 'WIN' : bt.pnl < 0 ? 'LOSS' : 'BE'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                    In: {bt.openPrice} • Out: {bt.closePrice ?? 'Running'}
                                  </p>
                                </div>
                              </div>

                              <span className={`font-mono text-xs font-bold ${bt.pnl && bt.pnl > 0 ? 'text-emerald-400' : bt.pnl && bt.pnl < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {btPnlText}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : isManualMode ? (
                      /* MANUAL MODE: Editable Form */
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
                              {/* Neutral Blue for Buy, Amber for Sell (NOT Red/Green) */}
                              <button
                                type="button"
                                onClick={() => { setManualDirection('buy'); markDirty() }}
                                className={cn(
                                  'flex-1 py-2 rounded-xl font-bold border transition-all',
                                  manualDirection === 'buy'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
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
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
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
                      /* SINGLE TRADE READ-ONLY MT5 SUMMARY */
                      <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Neutral Blue for Buy, Amber for Sell */}
                          <div
                            className={cn(
                              'h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
                              isBuy
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            )}
                          >
                            {isBuy ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-foreground text-sm">{trade?.symbol}</span>
                              <span
                                className={cn(
                                  'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                                  isBuy ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
                                )}
                              >
                                {trade?.direction}
                              </span>
                              <span className="text-xs font-mono text-muted-foreground">{trade?.volume} Lot</span>
                              {trade?.status !== 'open' && trade?.pnl !== undefined && (
                                <span
                                  className={cn(
                                    'text-[10px] font-black uppercase px-1.5 py-0.5 rounded text-white tracking-wider shrink-0',
                                    trade.pnl > 0 ? 'bg-emerald-600' : trade.pnl < 0 ? 'bg-red-600' : 'bg-slate-600'
                                  )}
                                >
                                  {trade.pnl > 0 ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BE'}
                                </span>
                              )}
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

                    {/* Editable SL & TP (only in single trade mode) */}
                    {!isBatchMode && (
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
                    )}
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
                          {!isBatchMode && exitInfo.plannedRR !== '-' ? `1:${exitInfo.plannedRR}` : '-'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border space-y-0.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase block">Eksekusi Exit</span>
                        <span className={cn('font-bold text-[10px] px-2 py-0.5 rounded-full border inline-block', isBatchMode ? 'bg-muted border-border text-muted-foreground' : exitInfo.exitBadgeColor)}>
                          {isBatchMode ? 'Multiple Exit' : exitInfo.exitTypeLabel}
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

                    {/* Horizontal R:R Gauge (in single trade mode) */}
                    {!isBatchMode && (
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
                    )}
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
                    {/* Mood / Emosi Saat Entry (Single-Select Radio Chips) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-foreground block">Emosi Saat Entry (Pilih 1)</label>
                        {mood && (
                          <button
                            type="button"
                            onClick={() => { setMood(undefined); markDirty() }}
                            className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                          >
                            Reset Pilihan
                          </button>
                        )}
                      </div>
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {(Object.keys(EMOTION_CATEGORY_DEFS) as EmotionCategoryKey[]).map((catKey) => {
                          const catDef = EMOTION_CATEGORY_DEFS[catKey]
                          const categoryEmotions = EMOTION_TAXONOMY.filter((e) => e.category === catKey)

                          return (
                            <div key={catKey} className="space-y-1">
                              <span className="text-[9px] font-extrabold uppercase text-muted-foreground tracking-wider block">
                                {catDef.label}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {categoryEmotions.map((m) => {
                                  const isSelected = mood === m.key
                                  return (
                                    <button
                                      key={m.key}
                                      type="button"
                                      onClick={() => {
                                        setMood(isSelected ? undefined : (m.key as any))
                                        markDirty()
                                      }}
                                      className={cn(
                                        'px-2.5 py-1 rounded-xl font-bold border transition-all flex items-center gap-1.5 cursor-pointer text-[11px]',
                                        isSelected
                                          ? `${m.badgeColor} ring-2 ring-primary/40 shadow-xs`
                                          : 'bg-card border-border/80 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                                      )}
                                    >
                                      <span>{m.emoji}</span>
                                      <span>{m.label}</span>
                                      {isSelected && <span className="text-[10px] ml-0.5">✓</span>}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
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
                        <span className="text-[10px] text-muted-foreground">Bisa pilih lebih dari satu</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {strategies.map((s: any) => {
                          const isSel = selectedStrategies.includes(s.id)
                          const itemColor = s.color || '#D4A94C'
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
                              style={
                                isSel
                                  ? { backgroundColor: itemColor, borderColor: itemColor, color: '#000000' }
                                  : { backgroundColor: `${itemColor}15`, borderColor: `${itemColor}60`, color: itemColor }
                              }
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 cursor-pointer shadow-2xs"
                            >
                              {s.name}
                            </button>
                          )
                        })}

                        {/* + Tambah Baru Chip */}
                        <button
                          type="button"
                          onClick={() => setIsAddStrategyOpen(true)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-dashed border-amber-500/60 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Tambah Baru
                        </button>
                      </div>
                    </div>

                    {/* Mistake Tags */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-foreground">Tag Kesalahan</label>
                        <span className="text-[10px] text-muted-foreground">Bisa pilih lebih dari satu</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mistakeTags.map((m: any) => {
                          const isSel = selectedMistakes.includes(m.id)
                          const itemColor = m.color || '#EF4444'
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
                              style={
                                isSel
                                  ? { backgroundColor: itemColor, borderColor: itemColor, color: '#FFFFFF' }
                                  : { backgroundColor: `${itemColor}15`, borderColor: `${itemColor}60`, color: itemColor }
                              }
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all hover:scale-105 cursor-pointer shadow-2xs"
                            >
                              {m.name}
                            </button>
                          )
                        })}

                        {/* + Tambah Baru Chip */}
                        <button
                          type="button"
                          onClick={() => setIsAddTagOpen(true)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-dashed border-red-500/60 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Tambah Baru
                        </button>
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
            {isBatchMode ? (
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => executeSave(false)}
                className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Simpan untuk Semua ({batchTrades.length} Trade)
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => executeSave(false)}
                  className="text-xs font-bold border-border hover:bg-muted"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                  Simpan
                </Button>

                <Button
                  size="sm"
                  disabled={isSaving}
                  onClick={() => executeSave(true)}
                  className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black shadow-md"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Simpan &amp; Lanjut →
                </Button>
              </>
            )}
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
                variant="danger"
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
