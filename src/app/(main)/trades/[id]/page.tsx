'use client'

import React, { useState, use } from 'react'
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
  Trash2,
} from 'lucide-react'
import { Trade, SelfGrade, MoodType } from '@/types/trade'
import { analyzeTradeExit } from '@/utils/trade-metrics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'

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

// ── Main Component ────────────────────────────────────────────
export default function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch trade detail
  const { data: trade, isLoading, isError, refetch } = useQuery({
    queryKey: ['trade', id],
    queryFn:  () => fetchTradeDetail(id),
    staleTime: 30_000,
  })

  // Fetch strategies & mistake tags
  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn:  fetchStrategies,
    staleTime: 60_000,
  })

  const { data: mistakeTags = [] } = useQuery({
    queryKey: ['mistake-tags'],
    queryFn:  fetchMistakeTags,
    staleTime: 60_000,
  })

  // Form state (initialized from API data)
  const [reasonEntry,        setReasonEntry]       = useState('')
  const [mood,               setMood]              = useState<MoodType | undefined>()
  const [discipline,         setDiscipline]        = useState<'yes' | 'no' | undefined>()
  const [lessonLearned,      setLessonLearned]     = useState('')
  const [riskPercent,        setRiskPercent]       = useState<number | undefined>()
  const [plannedRR,          setPlannedRR]         = useState<number | undefined>()
  const [actualRR,           setActualRR]          = useState<number | undefined>()
  const [selfGrade,          setSelfGrade]         = useState<SelfGrade | undefined>()
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([])
  const [selectedMistakes,   setSelectedMistakes]   = useState<string[]>([])
  const [editSl,             setEditSl]            = useState<string>('')
  const [editTp,             setEditTp]            = useState<string>('')
  const [formInitialized,    setFormInitialized]   = useState(false)
  const [uploadType,         setUploadType]        = useState<'entry' | 'exit'>('entry')

  // Initialize form from loaded trade data (only once)
  React.useEffect(() => {
    if (trade && !formInitialized) {
      setEditSl(trade.sl ? String(trade.sl) : '')
      setEditTp(trade.tp ? String(trade.tp) : '')
      const j = trade.trade_journal
      if (j) {
        setReasonEntry(j.reason_entry || '')
        setMood(j.mood)
        setDiscipline(j.discipline)
        setLessonLearned(j.lesson_learned || '')
        setRiskPercent(j.risk_percent)
        setPlannedRR(j.planned_rr)
        setActualRR(j.actual_rr)
        setSelfGrade(j.self_grade)
      }
      setSelectedStrategies((trade.strategies ?? []).map((s: {id: string}) => s.id))
      setSelectedMistakes((trade.mistakes ?? []).map((m: {id: string}) => m.id))
      setFormInitialized(true)
    }
  }, [trade, formInitialized])

  // Save journal mutation
  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => saveJournal(id, payload),
    onSuccess: () => {
      toast('Jurnal trade berhasil disimpan!', 'success')
      queryClient.invalidateQueries({ queryKey: ['trade', id] })
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      setTimeout(() => router.push('/trades'), 1000)
    },
    onError: (err: Error) => {
      toast(err.message || 'Gagal menyimpan jurnal', 'error')
    },
  })

  // Upload screenshot mutation
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

  const toggleStrategy = (sid: string) =>
    setSelectedStrategies((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid]
    )

  const toggleMistake = (mid: string) =>
    setSelectedMistakes((prev) =>
      prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]
    )

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast('Ukuran file maksimal 5MB!', 'error')
      return
    }
    uploadMutation.mutate({ file, type: uploadType })
    e.target.value = ''
  }

  const handleSaveJournal = (e: React.FormEvent) => {
    e.preventDefault()
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Memuat detail trade...</p>
      </div>
    )
  }

  // Error state
  if (isError || !trade) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-sm text-destructive">Trade tidak ditemukan atau terjadi kesalahan</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Coba Lagi
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/trades')}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Kembali
          </Button>
        </div>
      </div>
    )
  }

  const isBuy     = trade.direction === 'buy'
  const isProfit  = (trade.pnl || 0) >= 0
  const screenshots = trade.screenshots ?? []
  const journalStatus = trade.journal_status

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Nav */}
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <Link
          href="/trades"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat Trade
        </Link>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border',
            journalStatus === 'complete'
              ? 'bg-profit/10 text-profit border-profit/30'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
          )}
        >
          {journalStatus === 'complete' ? (
            <><CheckCircle2 className="h-3.5 w-3.5" /> Jurnal Lengkap</>
          ) : (
            <><AlertCircle className="h-3.5 w-3.5" /> Belum Dilengkapi</>
          )}
        </span>
      </div>

      {/* SECTION 1: Read-Only MT5 Trade Data */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center shrink-0',
                isBuy
                  ? 'bg-profit/15 text-profit border border-profit/30'
                  : 'bg-loss/15 text-loss border border-loss/30'
              )}
            >
              {isBuy ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">{trade.symbol}</h2>
                <span className={cn('text-xs font-bold uppercase px-2 py-0.5 rounded', isBuy ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss')}>
                  {trade.direction}
                </span>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                  {trade.volume} Lot
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ticket: #{trade.mt5_ticket_id} • Sesi:{' '}
                <span className="text-foreground capitalize font-medium">{trade.session || 'N/A'}</span>
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-xs text-muted-foreground block">Profit / Loss (PnL)</span>
            <span className={cn('text-2xl font-mono font-bold tracking-tight', isProfit ? 'text-profit' : 'text-loss')}>
              {trade.pnl !== null && trade.pnl !== undefined
                ? `${isProfit ? '+' : ''}$${Number(trade.pnl).toFixed(2)}`
                : 'Open'}
            </span>
          </div>
        </div>

        {/* Price Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: 'Harga Entry',       value: trade.open_price,  color: '' },
            { label: 'Harga Exit',        value: trade.close_price ?? 'Belum Exit', color: '' },
            { label: 'Stop Loss (SL)',     value: editSl || trade.sl || 'N/A', color: 'text-loss' },
            { label: 'Take Profit (TP)',   value: editTp || trade.tp || 'N/A', color: 'text-profit' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-muted/30 border border-border/50 rounded-xl p-3">
              <span className="text-muted-foreground block">{label}</span>
              <span className={cn('font-mono font-bold text-sm', color || 'text-foreground')}>{value}</span>
            </div>
          ))}
        </div>

        {/* Automatic SL/TP R:R & Exit Type Analysis */}
        {(() => {
          const currentSl = editSl !== '' ? Number(editSl) : trade.sl
          const currentTp = editTp !== '' ? Number(editTp) : trade.tp
          const exitInfo = analyzeTradeExit({
            direction: trade.direction,
            open_price: trade.open_price,
            close_price: trade.close_price,
            sl: currentSl,
            tp: currentTp,
            pnl: trade.pnl,
            status: trade.status,
          })
          return (
            <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                <span className="text-xs font-bold text-foreground">Analisis SL/TP &amp; Eksekusi Exit</span>
                <span className={cn('text-xs font-bold px-3 py-1 rounded-full border', exitInfo.exitBadgeColor)}>
                  {exitInfo.exitTypeLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-card border border-border/50 rounded-lg p-2.5 space-y-0.5">
                  <span className="text-muted-foreground block text-[11px]">Rencana R:R (Planned)</span>
                  <span className="font-mono font-extrabold text-primary text-base">{exitInfo.plannedRR}</span>
                  <span className="text-[10px] text-muted-foreground block">Berdasarkan SL &amp; TP</span>
                </div>
                <div className="bg-card border border-border/50 rounded-lg p-2.5 space-y-0.5">
                  <span className="text-muted-foreground block text-[11px]">Realisasi R:R (Actual)</span>
                  <span className={cn('font-mono font-extrabold text-base', isProfit ? 'text-profit' : 'text-loss')}>
                    {exitInfo.actualRR}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">Berdasarkan harga close</span>
                </div>
              </div>
            </div>
          )
        })()}

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex items-center gap-4">
            <span>Komisi: <strong className="text-foreground font-mono">${trade.commission}</strong></span>
            <span>Swap: <strong className="text-foreground font-mono">${trade.swap}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>
              Open:{' '}
              {new Date(trade.open_time).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
              })}
            </span>
            {trade.close_time && (
              <span className="ml-2">
                → Close:{' '}
                {new Date(trade.close_time).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Form Jurnal */}
      <form onSubmit={handleSaveJournal} className="space-y-6">
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-md space-y-5">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Form Refleksi &amp; Jurnal Kualitatif
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lengkapi kolom di bawah untuk evaluasi psikologi, strategi, dan pembelajaran.
            </p>
          </div>

          {/* Alasan Entry */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Alasan Entry (Setup &amp; Analisa)
            </label>
            <textarea
              rows={3}
              placeholder="Jelaskan analisa teknikal/fundamental saat mengambil trade ini..."
              value={reasonEntry}
              onChange={(e) => setReasonEntry(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-y"
            />
          </div>

          {/* Manual Input SL & TP (Jika dari MT5 bernilai 0 / N/A) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 border border-border/50 p-3.5 rounded-xl">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Stop Loss (SL) Manual
              </label>
              <input
                type="number"
                step="any"
                placeholder="Misal: 4040.00"
                value={editSl}
                onChange={(e) => setEditSl(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground block">Isi SL jika di MT5 tidak terpasang</span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Take Profit (TP) Manual
              </label>
              <input
                type="number"
                step="any"
                placeholder="Misal: 4065.00"
                value={editTp}
                onChange={(e) => setEditTp(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-[10px] text-muted-foreground block">Isi TP jika di MT5 tidak terpasang</span>
            </div>
          </div>

          {/* Mood & Disiplin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">Kondisi Emosi</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'confident', label: '😊 Percaya Diri' },
                  { key: 'neutral',   label: '😐 Netral' },
                  { key: 'fomo',      label: '😤 FOMO' },
                  { key: 'anxious',   label: '😰 Cemas' },
                  { key: 'greedy',    label: '🤑 Serakah' },
                ].map((m) => (
                  <button
                    key={m.key} type="button" onClick={() => setMood(m.key as MoodType)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer min-h-[36px]',
                      mood === m.key
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">Kedisiplinan</label>
              <div className="flex items-center gap-3">
                {[
                  { val: 'yes', label: '✓ Ikut Rules', active: 'bg-profit/20 text-profit border-profit' },
                  { val: 'no',  label: 'Melanggar Rules', active: 'bg-loss/20 text-loss border-loss' },
                ].map(({ val, label, active }) => (
                  <button
                    key={val} type="button"
                    onClick={() => setDiscipline(val as 'yes' | 'no')}
                    className={cn(
                      'flex-1 py-2.5 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer min-h-[44px]',
                      discipline === val ? active : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Strategies */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">Strategi / Setup</label>
            {strategies.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {strategies.map((s: { id: string; name: string }) => {
                  const sel = selectedStrategies.includes(s.id)
                  return (
                    <button
                      key={s.id} type="button" onClick={() => toggleStrategy(s.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer min-h-[36px]',
                        sel
                          ? 'bg-primary/20 text-primary border-primary font-bold'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {sel && <Check className="inline h-3.5 w-3.5 mr-1" />}
                      {s.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Belum ada strategi. Tambahkan di halaman Strategi &amp; Tag.</p>
            )}
          </div>

          {/* Risk %, Auto R:R, Self Grade */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input label="Risk (%)" type="number" step="0.1" placeholder="1.0"
              value={riskPercent ?? ''} onChange={(e) => setRiskPercent(parseFloat(e.target.value) || undefined)} />

            <div className="bg-muted/20 border border-border/60 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">Planned R:R</span>
              <span className="font-mono font-extrabold text-primary text-sm block">
                {(() => {
                  const currentSl = editSl !== '' ? Number(editSl) : trade.sl
                  const currentTp = editTp !== '' ? Number(editTp) : trade.tp
                  return analyzeTradeExit({
                    direction: trade.direction, open_price: trade.open_price, close_price: trade.close_price, sl: currentSl, tp: currentTp, pnl: trade.pnl, status: trade.status
                  }).plannedRR
                })()}
              </span>
              <span className="text-[9px] text-muted-foreground block">Auto dari SL &amp; TP</span>
            </div>

            <div className="bg-muted/20 border border-border/60 rounded-xl p-2.5 space-y-0.5">
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">Actual R:R</span>
              <span className={cn('font-mono font-extrabold text-sm block', isProfit ? 'text-profit' : 'text-loss')}>
                {(() => {
                  const currentSl = editSl !== '' ? Number(editSl) : trade.sl
                  const currentTp = editTp !== '' ? Number(editTp) : trade.tp
                  return analyzeTradeExit({
                    direction: trade.direction, open_price: trade.open_price, close_price: trade.close_price, sl: currentSl, tp: currentTp, pnl: trade.pnl, status: trade.status
                  }).actualRR
                })()}
              </span>
              <span className="text-[9px] text-muted-foreground block">Auto dari Harga Exit</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">Self Grade</label>
              <select
                value={selfGrade || ''}
                onChange={(e) => setSelfGrade((e.target.value as SelfGrade) || undefined)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
              >
                <option value="">Pilih Grade</option>
                <option value="A">Grade A (Sempurna)</option>
                <option value="B">Grade B (Bagus)</option>
                <option value="C">Grade C (Cukup)</option>
                <option value="D">Grade D (Kurang)</option>
                <option value="F">Grade F (Fatal)</option>
              </select>
            </div>
          </div>

          {/* Mistake Tags */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-loss uppercase tracking-wider">Tag Kesalahan</label>
            {mistakeTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mistakeTags.map((m: { id: string; name: string }) => {
                  const sel = selectedMistakes.includes(m.id)
                  return (
                    <button
                      key={m.id} type="button" onClick={() => toggleMistake(m.id)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer min-h-[36px]',
                        sel
                          ? 'bg-loss/20 text-loss border-loss font-bold'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {sel && <Check className="inline h-3.5 w-3.5 mr-1" />}
                      {m.name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Belum ada tag kesalahan. Tambahkan di halaman Strategi &amp; Tag.</p>
            )}
          </div>

          {/* Lesson Learned */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">Lesson Learned</label>
            <textarea
              rows={3}
              placeholder="Apa pelajaran utama dari trade ini..."
              value={lessonLearned}
              onChange={(e) => setLessonLearned(e.target.value)}
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-y"
            />
          </div>

          {/* Screenshots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Screenshot Chart (Opsional, max 5MB)
              </label>
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value as 'entry' | 'exit')}
                className="text-xs bg-background border border-border rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="entry">Entry</option>
                <option value="exit">Exit</option>
              </select>
            </div>

            {/* Existing screenshots */}
            {screenshots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {screenshots.map((shot: { id: string; type: string; url: string }) => (
                  <div key={shot.id} className="relative group rounded-xl overflow-hidden border border-border bg-black/40 aspect-video">
                    <img src={shot.url} alt={`Screenshot ${shot.type}`} className="w-full h-full object-contain" />
                    <span className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded capitalize">
                      {shot.type}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <label className={cn(
              'border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
              uploadMutation.isPending
                ? 'opacity-50 cursor-not-allowed border-border'
                : 'border-border hover:border-primary/50 bg-muted/20'
            )}>
              {uploadMutation.isPending ? (
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-primary" />
              )}
              <div className="text-center">
                <span className="text-xs font-semibold text-foreground">
                  {uploadMutation.isPending ? 'Mengupload...' : 'Klik untuk upload screenshot'}
                </span>
                <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP (max 5MB)</p>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageUpload}
                disabled={uploadMutation.isPending}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.push('/trades')}>
            Batal
          </Button>
          <Button variant="primary" type="submit" isLoading={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" /> Simpan Jurnal Trade
          </Button>
        </div>
      </form>
    </div>
  )
}
