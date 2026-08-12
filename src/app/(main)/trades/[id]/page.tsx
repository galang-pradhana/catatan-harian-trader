'use client'

import React, { useState, use, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Upload,
  Clock,
  TrendingUp,
  Loader2,
  RefreshCw,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ShieldAlert,
  Brain,
  BarChart3,
  FileText,
  Sparkles,
  X,
  Target,
  Pencil,
  Trash2
} from 'lucide-react'
import { Trade, SelfGrade, MoodType } from '@/types/trade'
import { analyzeTradeExit, computeTradeActualRR } from '@/utils/trade-metrics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'
import { ManualTradeModal } from '@/components/shared/manual-trade-modal'

// ── API Helpers ───────────────────────────────────────────────
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

async function saveJournal(id: string, payload: Record<string, unknown>) {
  const res = await fetch(`/api/trades/${id}/journal`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || 'Gagal menyimpan jurnal')
  }
  return res.json()
}

async function uploadScreenshot(tradeId: string, file: File, type: 'entry' | 'exit') {
  const form = new FormData()
  form.append('file', file)
  form.append('type', type)
  const res = await fetch(`/api/trades/${tradeId}/screenshots`, {
    method: 'POST',
    body:   form,
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
    body: JSON.stringify({ name, color: '#D4A94C' })
  })
  if (!res.ok) throw new Error('Gagal menambah strategi')
  const json = await res.json()
  return json.strategy
}

async function createMistakeTagApi(name: string) {
  const res = await fetch('/api/mistake-tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color: '#EF4444' })
  })
  if (!res.ok) throw new Error('Gagal menambah tag kesalahan')
  const json = await res.json()
  return json.mistake_tag
}

const moodOptions: Array<{ type: MoodType; label: string; emoji: string }> = [
  { type: 'confident', label: 'Percaya Diri', emoji: '😊' },
  { type: 'neutral',   label: 'Netral',       emoji: '😐' },
  { type: 'fomo',      label: 'FOMO',         emoji: '😤' },
  { type: 'anxious',   label: 'Cemas',        emoji: '😰' },
  { type: 'greedy',    label: 'Serakah',      emoji: '🤑' },
]

export default function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Collapsible Section States
  const [section1Open, setSection1Open] = useState(true)
  const [section2Open, setSection2Open] = useState(true)
  const [section3Open, setSection3Open] = useState(true)

  // Inline Modal States
  const [isAddStrategyOpen, setIsAddStrategyOpen]   = useState(false)
  const [newStrategyName,   setNewStrategyName]     = useState('')
  const [isAddTagOpen,      setIsAddTagOpen]        = useState(false)
  const [newTagName,        setNewTagName]          = useState('')
  const [isEditModalOpen,   setIsEditModalOpen]     = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false)

  // Fetch trade detail & metadata
  const { data: trade, isLoading, isError, refetch } = useQuery({
    queryKey: ['trade', id],
    queryFn:  () => fetchTradeDetail(id),
    staleTime: 30_000,
  })

  const { data: strategies = [], refetch: refetchStrats } = useQuery({
    queryKey: ['strategies'],
    queryFn:  fetchStrategies,
    staleTime: 60_000,
  })

  const { data: mistakeTags = [], refetch: refetchTags } = useQuery({
    queryKey: ['mistake-tags'],
    queryFn:  fetchMistakeTags,
    staleTime: 60_000,
  })

  // Form State
  const [reasonEntry,        setReasonEntry]        = useState('')
  const [mood,               setMood]               = useState<MoodType | undefined>()
  const [discipline,         setDiscipline]         = useState<'yes' | 'no' | undefined>()
  const [lessonLearned,      setLessonLearned]      = useState('')
  const [riskPercent,        setRiskPercent]        = useState<number | undefined>()
  const [plannedRR,          setPlannedRR]          = useState<number | undefined>()
  const [actualRR,           setActualRR]           = useState<number | undefined>()
  const [selfGrade,          setSelfGrade]          = useState<SelfGrade | undefined>()
  const [selectedStrategies, setSelectedStrategies]  = useState<string[]>([])
  const [selectedMistakes,   setSelectedMistakes]    = useState<string[]>([])
  const [editSl,             setEditSl]             = useState<string>('')
  const [editTp,             setEditTp]             = useState<string>('')
  const [formInitialized,    setFormInitialized]    = useState(false)
  const [uploadType,         setUploadType]         = useState<'entry' | 'exit'>('entry')
  const [lastSavedTime,      setLastSavedTime]      = useState<string | null>(null)

  // Initialize Form
  React.useEffect(() => {
    if (trade && !formInitialized) {
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
        if (j.updated_at) {
          setLastSavedTime(new Date(j.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        }
      } else {
        setActualRR(autoComputedRR !== null ? autoComputedRR : undefined)
      }
      setSelectedStrategies((trade.strategies ?? []).map((s: {id: string}) => s.id))
      setSelectedMistakes((trade.mistakes ?? []).map((m: {id: string}) => m.id))
      setFormInitialized(true)
    }
  }, [trade, formInitialized])

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => saveJournal(id, payload),
    onSuccess: () => {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLastSavedTime(nowStr)
      toast('Jurnal trade berhasil disimpan!', 'success')
      queryClient.invalidateQueries({ queryKey: ['trade', id] })
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      setTimeout(() => router.push('/trades'), 1000)
    },
    onError: (err: Error) => {
      toast(err.message || 'Gagal menyimpan jurnal', 'error')
    },
  })

  // Delete Mutation (manual only)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/trades/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal menghapus trade')
      }
    },
    onSuccess: () => {
      toast('Trade manual berhasil dihapus', 'success')
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      router.push('/trades')
    },
    onError: (err: Error) => {
      toast(err.message || 'Gagal menghapus trade', 'error')
    },
  })

  // Upload Screenshot Mutation
  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: 'entry' | 'exit' }) =>
      uploadScreenshot(id, file, type),
    onSuccess: () => {
      toast('Screenshot berhasil diupload!', 'success')
      queryClient.invalidateQueries({ queryKey: ['trade', id] })
    },
    onError: (err: Error) => {
      toast(err.message || 'Gagal upload screenshot', 'error')
    },
  })

  // Add Strategy Mutation
  const addStrategyMutation = useMutation({
    mutationFn: (name: string) => createStrategyApi(name),
    onSuccess: (newStrat) => {
      toast(`Strategi "${newStrat.name}" ditambahkan!`, 'success')
      refetchStrats()
      setSelectedStrategies((prev) => [...prev, newStrat.id])
      setNewStrategyName('')
      setIsAddStrategyOpen(false)
    },
  })

  // Add Mistake Tag Mutation
  const addTagMutation = useMutation({
    mutationFn: (name: string) => createMistakeTagApi(name),
    onSuccess: (newTag) => {
      toast(`Tag kesalahan "${newTag.name}" ditambahkan!`, 'success')
      refetchTags()
      setSelectedMistakes((prev) => [...prev, newTag.id])
      setNewTagName('')
      setIsAddTagOpen(false)
    },
  })

  // Calculate Completeness Progress (Requirement 2)
  const completeness = useMemo(() => {
    let filled = 0
    const totalFields = 8
    if (editSl) filled++
    if (editTp) filled++
    if (reasonEntry) filled++
    if (mood) filled++
    if (discipline) filled++
    if (selectedStrategies.length > 0) filled++
    if (lessonLearned) filled++
    if (selfGrade) filled++

    const percentage = Math.round((filled / totalFields) * 100)
    return { filled, totalFields, percentage }
  }, [editSl, editTp, reasonEntry, mood, discipline, selectedStrategies, lessonLearned, selfGrade])

  const toggleStrategy = (sid: string) =>
    setSelectedStrategies((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    )

  const toggleMistake = (mid: string) =>
    setSelectedMistakes((prev) =>
      prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]
    )

  const handleImageUpload = (type: 'entry' | 'exit', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('Ukuran file maksimal 5MB!', 'error')
      return
    }
    uploadMutation.mutate({ file, type })
    e.target.value = ''
  }

  const handleSaveJournal = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    saveMutation.mutate({
      sl:              editSl ? Number(editSl) : null,
      tp:              editTp ? Number(editTp) : null,
      reason_entry:    reasonEntry || undefined,
      mood:            mood || undefined,
      discipline:      discipline || undefined,
      lesson_learned:  lessonLearned || undefined,
      risk_percent:    riskPercent,
      planned_rr:      plannedRR,
      actual_rr:       actualRR,
      self_grade:      selfGrade || undefined,
      strategy_ids:    selectedStrategies,
      mistake_tag_ids: selectedMistakes,
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat detail trade...</p>
      </div>
    )
  }

  if (isError || !trade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm text-destructive">Trade tidak ditemukan</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/trades')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
        </Button>
      </div>
    )
  }

  const isBuy     = trade.direction === 'buy'
  const isProfit  = (trade.pnl || 0) >= 0
  const screenshots = trade.screenshots ?? []
  const entryScreenshot = screenshots.find((s: any) => s.type === 'entry')
  const exitScreenshot  = screenshots.find((s: any) => s.type === 'exit')

  // Robust property fallback for snake_case (DB API) vs camelCase
  const openP  = trade.open_price ?? trade.openPrice
  const closeP = trade.close_price ?? trade.closePrice
  const openT  = trade.open_time ?? trade.openTime
  const closeT = trade.close_time ?? trade.closeTime
  const slP    = editSl ? Number(editSl) : (trade.sl ?? null)
  const tpP    = editTp ? Number(editTp) : (trade.tp ?? null)

  const exitInfo = analyzeTradeExit({
    direction: trade.direction,
    open_price: openP,
    close_price: closeP ?? null,
    sl: slP,
    tp: tpP,
    pnl: trade.pnl ?? null,
    status: trade.status,
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
    <div className="space-y-6 max-w-4xl mx-auto pb-28 relative">
      {/* 📌 TOP STICKY PROGRESS & AUTOSAVE BAR (Requirement 2) */}
      <div className="sticky top-0 z-30 bg-card/90 border-b border-border/80 p-3.5 shadow-md backdrop-blur-md -mx-4 px-4 sm:-mx-6 sm:px-6 rounded-b-2xl space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/trades"
              className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <span className="font-extrabold text-foreground">
              Jurnal #{trade.mt5_ticket_id} ({trade.symbol})
            </span>

            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {completeness.filled}/{completeness.totalFields} Terisi ({completeness.percentage}%)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {lastSavedTime && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium hidden sm:inline-flex">
                <Check className="h-3 w-3 text-emerald-400" /> Tersimpan otomatis jam {lastSavedTime}
              </span>
            )}
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
      {/* 1️⃣ SECTION 1: DATA TRADE (MT5 Core Metrics) */}
      {/* ========================================================================= */}
      <div className="bg-card/70 border border-border/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 backdrop-blur-sm">
        <div
          onClick={() => setSection1Open(!section1Open)}
          className="flex items-center justify-between border-b border-border/60 pb-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-muted text-foreground">
              <BarChart3 className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                1. Data Perdagangan ({trade.source === 'manual' ? 'Manual Entry Trade' : trade.source === 'csv_import' ? 'CSV Import Trade' : 'MT5 Executed Trade'})
              </h2>
              <p className="text-xs text-muted-foreground">
                {trade.source === 'manual'
                  ? 'Harga entry, exit, volume & PnL diinput secara manual'
                  : trade.source === 'csv_import'
                  ? 'Data diimpor dari file CSV history'
                  : 'Harga entry, exit, volume, ticket & PnL terkunci dari MT5'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Edit & Delete buttons untuk trade manual */}
            {trade.source === 'manual' && (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all"
                  title="Edit data trade ini"
                >
                  <Pencil className="h-3 w-3" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 transition-all"
                  title="Hapus trade ini"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Hapus</span>
                </button>
              </div>
            )}
            <button type="button" className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
              {section1Open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {section1Open && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Header Symbol & PnL */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-muted/20 border border-border/60">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 font-bold',
                    isBuy
                      ? 'bg-profit/15 text-profit border border-profit/30'
                      : 'bg-loss/15 text-loss border border-loss/30'
                  )}
                >
                  {isBuy ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-extrabold text-foreground tracking-tight">{trade.symbol}</h3>
                    <span className={cn('text-xs font-bold uppercase px-2 py-0.5 rounded', isBuy ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss')}>
                      {trade.direction}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground bg-card px-2 py-0.5 rounded border border-border">
                      {trade.volume} Lot
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ticket: #{trade.mt5_ticket_id} • Sesi: <span className="text-foreground capitalize font-medium">{trade.session || 'N/A'}</span> • Sumber: <span className="text-amber-400 font-semibold">{trade.source === 'manual' ? '✍️ Manual Entry' : trade.source === 'csv_import' ? '📁 CSV Import' : '🤖 MT5 Sync'}</span>
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] text-muted-foreground block font-semibold uppercase tracking-wider">Hasil PnL</span>
                <span className={`text-2xl font-extrabold font-mono ${trade.status === 'open' ? 'text-primary' : isProfit ? 'text-emerald-400' : 'text-destructive'}`}>
                  {trade.pnl !== undefined ? `${isProfit ? '+' : ''}$${trade.pnl.toFixed(2)}` : 'Running'}
                </span>
              </div>
            </div>

            {/* Price Grid (Open - Close - SL - TP) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card border border-border rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Harga Entry</span>
                <span className="font-mono font-bold text-sm text-foreground">{openP ?? '-'}</span>
                <span className="text-[9px] text-muted-foreground block">{openT ? new Date(openT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block">Harga Exit</span>
                <span className="font-mono font-bold text-sm text-foreground">{closeP ?? '-'}</span>
                <span className="text-[9px] text-muted-foreground block">{closeT ? new Date(closeT).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Running'}</span>
              </div>

              <div className="bg-card border border-border rounded-2xl p-3.5 space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block">Stop Loss (SL)</label>
                <Input
                  type="number"
                  step="any"
                  value={editSl}
                  onChange={(e) => setEditSl(e.target.value)}
                  placeholder="Contoh: 1.0850"
                  className="font-mono text-xs h-8 bg-background border-border"
                />
              </div>

              <div className="bg-card border border-border rounded-2xl p-3.5 space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block">Take Profit (TP)</label>
                <Input
                  type="number"
                  step="any"
                  value={editTp}
                  onChange={(e) => setEditTp(e.target.value)}
                  placeholder="Contoh: 1.0950"
                  className="font-mono text-xs h-8 bg-background border-border"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2️⃣ SECTION 2: ANALISIS SL/TP & R:R GAUGE (Requirement 3) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-card via-card to-amber-500/10 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div
          onClick={() => setSection2Open(!section2Open)}
          className="flex items-center justify-between border-b border-border/60 pb-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                2. Analisis Risk:Reward (Planned vs Actual R:R)
              </h2>
              <p className="text-xs text-muted-foreground">Gauge visual posisi harga close terhadap area SL, Entry &amp; TP</p>
            </div>
          </div>
          <button type="button" className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            {section2Open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {section2Open && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Planned vs Actual R:R Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Planned R:R</span>
                <span className="font-mono font-extrabold text-base text-amber-400">
                  {exitInfo.plannedRR !== '-' ? `1:${exitInfo.plannedRR}` : 'Belum diisi'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Eksekusi Exit</span>
                <span className={cn('font-bold text-xs px-2.5 py-1 rounded-full border inline-block mt-0.5', exitInfo.exitBadgeColor)}>
                  {exitInfo.exitTypeLabel}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-card border border-border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block">Risk % Account</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={riskPercent ?? ''}
                    onChange={(e) => setRiskPercent(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="1.0"
                    className="font-mono text-xs h-7 w-20 bg-background border-border"
                  />
                  <span className="font-bold text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            {/* 📊 HORIZONTAL R:R GAUGE BAR (Requirement 3) */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-destructive flex items-center gap-1">🔴 SL: {slP ?? 'N/A'}</span>
                <span className="text-foreground">⚪ Entry: {openP}</span>
                <span className="text-emerald-400 flex items-center gap-1">🟢 TP: {tpP ?? 'N/A'}</span>
              </div>

              {/* Bar Visual Track */}
              <div className="relative w-full h-4 bg-muted/60 rounded-full overflow-hidden flex">
                <div className="w-1/2 h-full bg-destructive/30 border-r border-background" />
                <div className="w-1/2 h-full bg-emerald-500/30" />

                {/* Actual Exit Marker */}
                <div
                  className="absolute top-0 bottom-0 w-2.5 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.8)] border border-background transition-all duration-300 -ml-1.25"
                  style={{ left: `${actualMarkerPct}%` }}
                  title={`Actual Exit: ${closeP}`}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold pt-1">
                <span>Area Stop Loss</span>
                <span className="text-amber-400 font-mono">Marker Exit: {closeP}</span>
                <span>Area Take Profit</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3️⃣ SECTION 3: FORM REFLEKSI & JURNAL KUALITATIF (Requirement 5) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-card via-card to-emerald-500/10 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
        <div
          onClick={() => setSection3Open(!section3Open)}
          className="flex items-center justify-between border-b border-border/60 pb-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground flex items-center gap-2">
                3. Refleksi &amp; Jurnal Kualitatif
              </h2>
              <p className="text-xs text-muted-foreground">Kondisi emosi, kedisiplinan, strategi, tag kesalahan &amp; screenshot</p>
            </div>
          </div>
          <button type="button" className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            {section3Open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>

        {section3Open && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Grid 1: Mood/Emosi & Kedisiplinan Pill Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Mood Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground">
                  Kondisi Emosi Saat Entry
                </label>
                <div className="flex flex-wrap gap-2">
                  {moodOptions.map((m) => (
                    <button
                      key={m.type}
                      type="button"
                      onClick={() => setMood(m.type)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5',
                        mood === m.type
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-md ring-1 ring-purple-500/30'
                          : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/30'
                      )}
                    >
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kedisiplinan Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-foreground">
                  Kedisiplinan Rencana Trading
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscipline('yes')}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      discipline === 'yes'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-md'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted/30'
                    )}
                  >
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Ikut Rules (Disiplin)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiscipline('no')}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5',
                      discipline === 'no'
                        ? 'bg-destructive/20 text-destructive border-destructive/50 shadow-md'
                        : 'bg-card border-border text-muted-foreground hover:bg-muted/30'
                    )}
                  >
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    <span>Melanggar Rules</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid 2: Strategi & Tag Kesalahan (With Inline CTAs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Strategi Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Strategi / Setup Digunakan</label>
                  <button
                    type="button"
                    onClick={() => setIsAddStrategyOpen(true)}
                    className="text-[11px] font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Tambah Strategi
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {strategies.map((s: any) => {
                    const isSelected = selectedStrategies.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStrategy(s.id)}
                        className={cn(
                          'px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-sm'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted/30'
                        )}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                  {strategies.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Belum ada strategi tersimpan.</p>
                  )}
                </div>
              </div>

              {/* Tag Kesalahan Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">Tag Kesalahan (Jika Ada)</label>
                  <button
                    type="button"
                    onClick={() => setIsAddTagOpen(true)}
                    className="text-[11px] font-bold text-destructive hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Tambah Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {mistakeTags.map((m: any) => {
                    const isSelected = selectedMistakes.includes(m.id)
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMistake(m.id)}
                        className={cn(
                          'px-3 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                          isSelected
                            ? 'bg-destructive text-white border-destructive font-bold shadow-sm'
                            : 'bg-card border-border text-muted-foreground hover:bg-muted/30'
                        )}
                      >
                        {m.name}
                      </button>
                    )
                  })}
                  {mistakeTags.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Belum ada tag kesalahan.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Textarea 1: Alasan Entry */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Alasan &amp; Konfirmasi Entry</label>
              <textarea
                rows={3}
                value={reasonEntry}
                onChange={(e) => setReasonEntry(e.target.value)}
                placeholder="Tulis alasan teknikal/fundamental entry (contoh: Breakout H4, Retest FVG, Confluence EMA 200)..."
                className="w-full bg-background border border-border rounded-2xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-all resize-y"
              />
            </div>

            {/* Textarea 2: Pelajaran / Catatan Refleksi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-foreground">Pelajaran &amp; Catatan Refleksi</label>
              <textarea
                rows={3}
                value={lessonLearned}
                onChange={(e) => setLessonLearned(e.target.value)}
                placeholder="Apa pelajaran berharga atau hal yang bisa diperbaiki dari posisi trade ini..."
                className="w-full bg-background border border-border rounded-2xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500 transition-all resize-y"
              />
            </div>

            {/* Multi Screenshot Upload & Side-by-Side Thumbnail Preview (Requirement 5) */}
            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-foreground">Screenshot Chart (Entry &amp; Exit)</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Entry Screenshot Box */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                  <span className="text-xs font-bold text-foreground block">1. Screenshot Entry</span>
                  {entryScreenshot ? (
                    <div className="relative group rounded-xl overflow-hidden border border-border">
                      <img src={entryScreenshot.url} alt="Entry Screenshot" className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a href={entryScreenshot.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-white underline">
                          Buka Gambar Utuh
                        </a>
                      </div>
                    </div>
                  ) : (
                    <label className="h-36 rounded-xl border border-dashed border-border/80 bg-muted/10 hover:bg-muted/30 flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs font-bold text-foreground">+ Upload Entry</span>
                      <span className="text-[10px] text-muted-foreground">PNG/JPG Max 5MB</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload('entry', e)} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Exit Screenshot Box */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                  <span className="text-xs font-bold text-foreground block">2. Screenshot Exit</span>
                  {exitScreenshot ? (
                    <div className="relative group rounded-xl overflow-hidden border border-border">
                      <img src={exitScreenshot.url} alt="Exit Screenshot" className="w-full h-36 object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a href={exitScreenshot.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-white underline">
                          Buka Gambar Utuh
                        </a>
                      </div>
                    </div>
                  ) : (
                    <label className="h-36 rounded-xl border border-dashed border-border/80 bg-muted/10 hover:bg-muted/30 flex flex-col items-center justify-center cursor-pointer transition-all">
                      <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs font-bold text-foreground">+ Upload Exit</span>
                      <span className="text-[10px] text-muted-foreground">PNG/JPG Max 5MB</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload('exit', e)} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 📌 BOTTOM FLOATING ACTION BAR (Requirement 2) */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-8 sm:w-auto z-40 bg-card/95 border border-amber-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center gap-3 justify-between">
        <Link
          href="/trades"
          className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
        >
          Batal
        </Link>

        <Button
          type="button"
          onClick={() => handleSaveJournal()}
          disabled={saveMutation.isPending}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-all"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" /> Simpan Jurnal Trade
            </>
          )}
        </Button>
      </div>

      {/* ➕ MODAL QUICK ADD STRATEGY */}
      {isAddStrategyOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" /> Tambah Strategi Baru
              </h3>
              <button type="button" onClick={() => setIsAddStrategyOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block font-semibold">Nama Strategi / Setup</label>
              <Input
                type="text"
                placeholder="Contoh: Breakout FVG H4"
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAddStrategyOpen(false)}>Batal</Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!newStrategyName.trim() || addStrategyMutation.isPending}
                onClick={() => addStrategyMutation.mutate(newStrategyName.trim())}
              >
                {addStrategyMutation.isPending ? 'Menyimpan...' : 'Simpan Strategi'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ➕ MODAL QUICK ADD MISTAKE TAG */}
      {isAddTagOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" /> Tambah Tag Kesalahan
              </h3>
              <button type="button" onClick={() => setIsAddTagOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground block font-semibold">Nama Tag Kesalahan</label>
              <Input
                type="text"
                placeholder="Contoh: Geser SL / Overlot"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAddTagOpen(false)}>Batal</Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!newTagName.trim() || addTagMutation.isPending}
                onClick={() => addTagMutation.mutate(newTagName.trim())}
              >
                {addTagMutation.isPending ? 'Menyimpan...' : 'Simpan Tag'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT TRADE MODAL (Manual trades only) */}
      {trade.source === 'manual' && (
        <ManualTradeModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            refetch()
          }}
          mode="edit"
          tradeId={id}
          initialData={{
            symbol:     trade.symbol,
            direction:  trade.direction as 'buy' | 'sell',
            volume:     String(trade.volume ?? ''),
            openPrice:  String(trade.open_price ?? trade.openPrice ?? ''),
            closePrice: String(trade.close_price ?? trade.closePrice ?? ''),
            openTime:   trade.open_time ?? trade.openTime ?? '',
            closeTime:  trade.close_time ?? trade.closeTime ?? '',
            sl:         String(trade.sl ?? ''),
            tp:         String(trade.tp ?? ''),
            pnl:        String(trade.pnl ?? ''),
            commission: String(trade.commission ?? '0'),
            swap:       String(trade.swap ?? '0'),
            session:    (trade.session as any) ?? '',
          }}
        />
      )}

      {/* 🗑️ DELETE CONFIRM MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-destructive/30 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Hapus Trade Manual?</h3>
                <p className="text-xs text-muted-foreground">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              <p className="text-xs text-destructive/90">
                Trade <strong>{trade.symbol}</strong> ({trade.direction?.toUpperCase()}) akan dihapus beserta semua catatan jurnal dan screenshot yang terkait.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Batal
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="font-bold"
              >
                {!deleteMutation.isPending && <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                Ya, Hapus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
