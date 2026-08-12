'use client'

import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X, CheckCircle2, Loader2, DollarSign, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'
import { cn } from '@/lib/utils'

interface CloseTradeModalProps {
  isOpen: boolean
  onClose: () => void
  trade: {
    id: string
    symbol: string
    direction: 'buy' | 'sell'
    openPrice: number
    volume: number
    pnl?: number
  }
}

function toLocalDatetimeInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CloseTradeModal({ isOpen, onClose, trade }: CloseTradeModalProps) {
  const queryClient = useQueryClient()
  const [closePrice, setClosePrice] = useState('')
  const [closeTime, setCloseTime] = useState(toLocalDatetimeInput())
  const [pnlOverride, setPnlOverride] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const estPnl = (() => {
    const cp = Number(closePrice)
    const op = Number(trade.openPrice)
    const vol = Number(trade.volume)
    if (!cp || !op || !vol || isNaN(cp)) return null
    const diff = trade.direction === 'buy' ? cp - op : op - cp
    return parseFloat((diff * vol * 100).toFixed(2))
  })()

  const handleClose = async () => {
    if (!closePrice) {
      toast('Harga close wajib diisi', 'error')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          close_price: Number(closePrice),
          close_time: closeTime ? new Date(closeTime).toISOString() : new Date().toISOString(),
          pnl: pnlOverride ? Number(pnlOverride) : null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Gagal menutup trade')
      }

      toast(`✅ Trade ${trade.symbol} berhasil ditutup!`, 'success')
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      onClose()
    } catch (err: any) {
      toast(err?.message || 'Terjadi kesalahan', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-foreground">Tutup Posisi Trade</h3>
              <p className="text-[10px] text-muted-foreground font-mono">
                {trade.symbol} {trade.direction.toUpperCase()} @ {trade.openPrice}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Harga Close */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider">
              Harga Close *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="number"
                step="any"
                autoFocus
                value={closePrice}
                onChange={(e) => setClosePrice(e.target.value)}
                placeholder="Contoh: 1.0920"
                className="w-full h-10 rounded-xl border border-border bg-background pl-8 pr-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>

          {/* Live PnL Preview */}
          {closePrice && (
            <div className={cn(
              'flex items-center justify-between p-3 rounded-xl border text-xs',
              estPnl === null ? 'bg-muted/20 border-border' :
              (estPnl >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-destructive/30')
            )}>
              <span className="text-muted-foreground">Estimasi PnL</span>
              <span className={cn(
                'font-mono font-extrabold text-sm',
                estPnl === null ? 'text-muted-foreground' :
                estPnl >= 0 ? 'text-emerald-400' : 'text-destructive'
              )}>
                {estPnl === null ? '—' : `${estPnl >= 0 ? '+' : ''}$${Math.abs(estPnl).toFixed(2)}`}
              </span>
            </div>
          )}

          {/* Waktu Close */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3" /> Waktu Close
            </label>
            <input
              type="datetime-local"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>

          {/* Override PnL (opsional) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Override PnL <span className="font-normal normal-case">(jika tahu nilai exaknya)</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={pnlOverride}
              onChange={(e) => setPnlOverride(e.target.value)}
              placeholder={estPnl !== null ? `Est. $${estPnl}` : 'Opsional'}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2.5">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={handleClose}
            isLoading={isLoading}
            disabled={!closePrice}
            className="flex-1 font-bold"
          >
            {!isLoading && <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
            Tutup Trade
          </Button>
        </div>
      </div>
    </div>
  )
}
