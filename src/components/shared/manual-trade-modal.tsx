'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  X, ArrowUpRight, ArrowDownRight, ChevronRight, ChevronLeft,
  Check, Loader2, TrendingUp, Clock, DollarSign, BarChart3,
  Globe, Pencil, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type Direction = 'buy' | 'sell'
type Session = 'asia' | 'london' | 'newyork'
type TradeMode = 'create' | 'edit'

interface ManualTradeForm {
  symbol: string
  direction: Direction
  volume: string
  openPrice: string
  closePrice: string
  openTime: string
  closeTime: string
  sl: string
  tp: string
  pnl: string
  commission: string
  swap: string
  session: Session | ''
}

interface ManualTradeModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: TradeMode
  tradeId?: string
  connectionId?: string
  initialData?: Partial<ManualTradeForm>
}

// ─── Konstanta ────────────────────────────────────────────────────────────────
const STEPS = ['Dasar', 'Harga & Volume', 'Waktu & Hasil', 'Konfirmasi'] as const

const SESSION_OPTIONS: Array<{ value: Session; label: string; flag: string; time: string }> = [
  { value: 'asia',    label: 'Asia',     flag: '🇯🇵', time: '00:00–09:00 WIB' },
  { value: 'london',  label: 'London',   flag: '🇬🇧', time: '14:00–23:00 WIB' },
  { value: 'newyork', label: 'New York', flag: '🇺🇸', time: '19:00–04:00 WIB' },
]

const POPULAR_SYMBOLS = ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'USDCAD', 'NAS100', 'US30']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toLocalDatetimeInput(isoStr?: string): string {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function nowLocalInput(): string {
  return toLocalDatetimeInput(new Date().toISOString())
}

function calcEstPnl(direction: Direction, openPrice: string, closePrice: string, volume: string): number | null {
  const op = Number(openPrice)
  const cp = Number(closePrice)
  const vol = Number(volume)
  if (!op || !cp || !vol || isNaN(op) || isNaN(cp) || isNaN(vol)) return null
  const diff = direction === 'buy' ? cp - op : op - cp
  return parseFloat((diff * vol * 100).toFixed(2))
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold transition-all duration-200',
                i < current
                  ? 'bg-primary text-primary-foreground'
                  : i === current
                  ? 'bg-primary/20 text-primary border border-primary/40 ring-2 ring-primary/20'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {i < current ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span
              className={cn(
                'text-[10px] font-bold hidden sm:block',
                i === current ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
          </div>
          {i < total - 1 && (
            <div className={cn('h-px flex-1 min-w-[16px] transition-colors', i < current ? 'bg-primary' : 'bg-border')} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export function ManualTradeModal({
  isOpen,
  onClose,
  mode = 'create',
  tradeId,
  connectionId,
  initialData,
}: ManualTradeModalProps) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [symbolInput, setSymbolInput] = useState('')
  const [connections, setConnections] = useState<any[]>([])
  const [selectedConnId, setSelectedConnId] = useState<string>(connectionId || '')

  useEffect(() => {
    if (isOpen) {
      if (connectionId) {
        setSelectedConnId(connectionId)
      }
      fetch('/api/mt5/connections')
        .then((res) => res.json())
        .then((data) => {
          if (data.connections && Array.isArray(data.connections)) {
            setConnections(data.connections)
            if (!connectionId && data.connections.length > 0) {
              const manualConn = data.connections.find((c: any) => c.platform === 'manual')
              setSelectedConnId(manualConn ? manualConn.id : data.connections[0].id)
            }
          }
        })
        .catch(() => {})
    }
  }, [isOpen, connectionId])

  const [form, setForm] = useState<ManualTradeForm>({
    symbol: '',
    direction: 'buy',
    volume: '0.01',
    openPrice: '',
    closePrice: '',
    openTime: nowLocalInput(),
    closeTime: '',
    sl: '',
    tp: '',
    pnl: '',
    commission: '0',
    swap: '0',
    session: '',
  })

  // Init from initialData (edit mode)
  useEffect(() => {
    if (initialData && isOpen) {
      setForm((prev) => ({
        ...prev,
        symbol:     initialData.symbol     ?? prev.symbol,
        direction:  initialData.direction  ?? prev.direction,
        volume:     initialData.volume     ?? prev.volume,
        openPrice:  initialData.openPrice  ?? prev.openPrice,
        closePrice: initialData.closePrice ?? prev.closePrice,
        openTime:   initialData.openTime   ?? prev.openTime,
        closeTime:  initialData.closeTime  ?? prev.closeTime,
        sl:         initialData.sl         ?? prev.sl,
        tp:         initialData.tp         ?? prev.tp,
        pnl:        initialData.pnl        ?? prev.pnl,
        commission: initialData.commission ?? prev.commission,
        swap:       initialData.swap       ?? prev.swap,
        session:    initialData.session    ?? prev.session,
      }))
      setSymbolInput(initialData.symbol ?? '')
    }
  }, [initialData, isOpen])

  // Reset saat tutup
  useEffect(() => {
    if (!isOpen) {
      setStep(0)
      if (mode === 'create') {
        setForm({
          symbol: '', direction: 'buy', volume: '0.01',
          openPrice: '', closePrice: '', openTime: nowLocalInput(),
          closeTime: '', sl: '', tp: '', pnl: '',
          commission: '0', swap: '0', session: '',
        })
        setSymbolInput('')
      }
    }
  }, [isOpen, mode])

  const set = useCallback(<K extends keyof ManualTradeForm>(key: K, val: ManualTradeForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }, [])

  const estPnl = calcEstPnl(form.direction, form.openPrice, form.closePrice, form.volume)
  const isClosed = Boolean(form.closePrice)

  // ─── Validation per step ──────────────────────────────────────────────────
  const canNext = [
    Boolean(form.symbol && form.direction),                // step 0
    Boolean(form.openPrice && form.volume),                // step 1
    Boolean(form.openTime),                               // step 2
    true,                                                 // step 3 confirm
  ][step]

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      const payload = {
        connectionId: selectedConnId || connectionId,
        symbol:      form.symbol.toUpperCase().trim(),
        direction:   form.direction,
        volume:      Number(form.volume),
        open_price:  Number(form.openPrice),
        close_price: form.closePrice ? Number(form.closePrice) : null,
        open_time:   new Date(form.openTime).toISOString(),
        close_time:  form.closeTime ? new Date(form.closeTime).toISOString() : null,
        sl:          form.sl ? Number(form.sl) : null,
        tp:          form.tp ? Number(form.tp) : null,
        pnl:         form.pnl ? Number(form.pnl) : null,
        commission:  Number(form.commission) || 0,
        swap:        Number(form.swap) || 0,
        session:     form.session || null,
      }

      if (mode === 'edit' && tradeId) {
        const res = await fetch(`/api/trades/${tradeId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Gagal menyimpan perubahan')
        }
        toast('✅ Trade berhasil diperbarui!', 'success')
      } else {
        const res = await fetch('/api/trades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message || 'Gagal menambah trade')
        }
        toast('✅ Trade manual berhasil ditambahkan!', 'success')
      }

      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['trade', tradeId] })
      onClose()
    } catch (err: any) {
      toast(err?.message || 'Terjadi kesalahan', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-xl bg-card border border-border/80 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              mode === 'edit' ? 'bg-amber-500/15 text-amber-400' : 'bg-primary/15 text-primary'
            )}>
              {mode === 'edit' ? <Pencil className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-foreground">
                {mode === 'edit' ? 'Edit Trade Manual' : 'Tambah Trade Manual'}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {mode === 'edit' ? `Trade ID: ${tradeId?.slice(0, 8)}...` : 'Input data trade secara manual'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-5 py-3 bg-muted/20 border-b border-border/40 shrink-0">
          <StepIndicator current={step} total={STEPS.length} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

          {/* ──────────── STEP 0: DASAR ──────────── */}
          {step === 0 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Account Selector */}
              {connections.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                    Akun Trading Target
                  </label>
                  <select
                    value={selectedConnId}
                    onChange={(e) => setSelectedConnId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {connections.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.brokerName || c.broker_name || 'Trading Account'} ({(c.platform || 'mt5').toUpperCase()}{c.accountNumber ? ` #${c.accountNumber}` : ''})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                  Simbol / Pair
                </label>
                <input
                  type="text"
                  value={symbolInput}
                  onChange={(e) => {
                    setSymbolInput(e.target.value.toUpperCase())
                    set('symbol', e.target.value.toUpperCase())
                  }}
                  placeholder="Contoh: XAUUSD, EURUSD, NAS100"
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
                {/* Quick select symbols */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {POPULAR_SYMBOLS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSymbolInput(s); set('symbol', s) }}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
                        form.symbol === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                  Arah Posisi
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => set('direction', 'buy')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150',
                      form.direction === 'buy'
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'bg-card border-border text-muted-foreground hover:border-emerald-500/30'
                    )}
                  >
                    <ArrowUpRight className={cn('w-6 h-6', form.direction === 'buy' ? 'text-emerald-400' : '')} />
                    <span className="font-extrabold text-sm">BUY</span>
                    <span className="text-[10px] opacity-70">Long / Beli</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => set('direction', 'sell')}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150',
                      form.direction === 'sell'
                        ? 'bg-destructive/15 border-destructive/60 text-destructive shadow-md shadow-destructive/10'
                        : 'bg-card border-border text-muted-foreground hover:border-destructive/30'
                    )}
                  >
                    <ArrowDownRight className={cn('w-6 h-6', form.direction === 'sell' ? 'text-destructive' : '')} />
                    <span className="font-extrabold text-sm">SELL</span>
                    <span className="text-[10px] opacity-70">Short / Jual</span>
                  </button>
                </div>
              </div>

              {/* Session */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground/80 uppercase tracking-wider">
                  Sesi Trading <span className="text-muted-foreground font-normal normal-case">(opsional)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SESSION_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => set('session', form.session === s.value ? '' : s.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center',
                        form.session === s.value
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-card border-border text-muted-foreground hover:border-primary/20'
                      )}
                    >
                      <span className="text-lg">{s.flag}</span>
                      <span className="text-[11px] font-bold">{s.label}</span>
                      <span className="text-[9px] opacity-60">{s.time}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ──────────── STEP 1: HARGA & VOLUME ──────────── */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Live Preview Badge */}
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-xl border text-xs font-bold',
                form.direction === 'buy'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              )}>
                {form.direction === 'buy'
                  ? <ArrowUpRight className="w-4 h-4" />
                  : <ArrowDownRight className="w-4 h-4" />}
                <span>{form.direction.toUpperCase()} {form.symbol || '—'}</span>
                {form.session && (
                  <span className="ml-auto text-[10px] text-muted-foreground font-normal">
                    Sesi: {SESSION_OPTIONS.find(s => s.value === form.session)?.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Harga Entry *</label>
                  <input
                    type="number" step="any" value={form.openPrice}
                    onChange={(e) => set('openPrice', e.target.value)}
                    placeholder="1.08500"
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">Lot Size *</label>
                  <input
                    type="number" step="0.01" min="0.01" value={form.volume}
                    onChange={(e) => set('volume', e.target.value)}
                    placeholder="0.01"
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stop Loss (SL)</label>
                  <input
                    type="number" step="any" value={form.sl}
                    onChange={(e) => set('sl', e.target.value)}
                    placeholder="1.0820"
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-destructive/50 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Take Profit (TP)</label>
                  <input
                    type="number" step="any" value={form.tp}
                    onChange={(e) => set('tp', e.target.value)}
                    placeholder="1.0920"
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Close Price (opsional) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Harga Close <span className="font-normal normal-case">(kosongkan jika trade masih Open)</span>
                </label>
                <input
                  type="number" step="any" value={form.closePrice}
                  onChange={(e) => set('closePrice', e.target.value)}
                  placeholder="Kosongkan untuk posisi Open / Running"
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              {/* Live PnL Estimasi */}
              {isClosed && (
                <div className={cn(
                  'flex items-center justify-between p-3.5 rounded-xl border',
                  estPnl === null ? 'bg-muted/30 border-border' :
                  estPnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30'
                )}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Estimasi PnL (Auto)</span>
                  </div>
                  <span className={cn(
                    'font-mono font-extrabold text-sm',
                    estPnl === null ? 'text-muted-foreground' :
                    estPnl >= 0 ? 'text-emerald-400' : 'text-destructive'
                  )}>
                    {estPnl === null ? '—' : `${estPnl >= 0 ? '+' : ''}$${Math.abs(estPnl).toFixed(2)}`}
                  </span>
                </div>
              )}

              {/* Manual PnL override */}
              {isClosed && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Override PnL Manual <span className="font-normal normal-case">(isi jika tahu nilai exaknya)</span>
                  </label>
                  <input
                    type="number" step="0.01" value={form.pnl}
                    onChange={(e) => set('pnl', e.target.value)}
                    placeholder={estPnl !== null ? `Est. ${estPnl}` : 'Opsional'}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              )}
            </div>
          )}

          {/* ──────────── STEP 2: WAKTU & BIAYA ──────────── */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">
                  Waktu Open *
                </label>
                <input
                  type="datetime-local"
                  value={form.openTime}
                  onChange={(e) => set('openTime', e.target.value)}
                  className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>

              {isClosed && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">
                    Waktu Close
                  </label>
                  <input
                    type="datetime-local"
                    value={form.closeTime}
                    onChange={(e) => set('closeTime', e.target.value)}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Commission</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="number" step="0.01" value={form.commission}
                      onChange={(e) => set('commission', e.target.value)}
                      placeholder="0"
                      className="w-full h-10 rounded-xl border border-border bg-background pl-8 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Swap</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="number" step="0.01" value={form.swap}
                      onChange={(e) => set('swap', e.target.value)}
                      placeholder="0"
                      className="w-full h-10 rounded-xl border border-border bg-background pl-8 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Status indicator */}
              <div className={cn(
                'p-3.5 rounded-xl border flex items-center gap-3',
                isClosed ? 'bg-muted/20 border-border' : 'bg-primary/10 border-primary/30'
              )}>
                <div className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  isClosed ? 'bg-muted-foreground' : 'bg-primary animate-pulse'
                )} />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Status: {isClosed ? 'Closed' : 'Open / Running'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isClosed ? 'Trade akan dicatat sebagai posisi tertutup' : 'Trade akan dicatat sebagai posisi masih berjalan'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ──────────── STEP 3: KONFIRMASI ──────────── */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-3">
                <p className="text-xs font-extrabold text-foreground/80 uppercase tracking-wider">Ringkasan Trade</p>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                  {[
                    { label: 'Simbol', value: form.symbol || '—' },
                    { label: 'Arah', value: (
                      <span className={cn('font-extrabold', form.direction === 'buy' ? 'text-emerald-400' : 'text-destructive')}>
                        {form.direction.toUpperCase()}
                      </span>
                    )},
                    { label: 'Lot Size', value: `${form.volume} Lot` },
                    { label: 'Status', value: isClosed ? 'Closed' : 'Open' },
                    { label: 'Harga Entry', value: form.openPrice || '—' },
                    { label: 'Harga Close', value: form.closePrice || '—' },
                    { label: 'SL', value: form.sl || '—' },
                    { label: 'TP', value: form.tp || '—' },
                    { label: 'Sesi', value: SESSION_OPTIONS.find(s => s.value === form.session)?.label || 'Tidak dipilih' },
                    { label: 'PnL', value: (
                      <span className={cn('font-mono font-extrabold', (form.pnl ? Number(form.pnl) : estPnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-destructive')}>
                        {form.pnl ? `$${form.pnl}` : estPnl !== null ? `~$${estPnl}` : '—'}
                      </span>
                    )},
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <span className="text-muted-foreground block text-[10px]">{label}</span>
                      <span className="font-bold text-foreground font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3.5">
                <p className="text-[11px] text-amber-500/90 flex items-start gap-2">
                  <span className="text-base leading-none">💡</span>
                  <span>Setelah trade disimpan, kamu bisa langsung isi jurnal refleksi di halaman detail trade untuk melengkapi catatan trading kamu.</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border/60 bg-card shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}
            className="text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {step === 0 ? 'Batal' : 'Kembali'}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="text-xs font-bold"
            >
              Lanjut
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={handleSubmit}
              isLoading={isLoading}
              className="text-xs font-bold min-w-[120px]"
            >
              {!isLoading && <Check className="w-4 h-4 mr-1.5" />}
              {mode === 'edit' ? 'Simpan Perubahan' : 'Tambah Trade'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
