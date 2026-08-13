'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Loader2,
  HelpCircle,
  Save,
  Calculator,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PipConfigItem {
  id: string | null
  symbol: string
  pip_size: number | null
  is_confirmed: boolean
  updated_at: string | null
}

interface PipConfigModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PipConfigModal({ isOpen, onClose }: PipConfigModalProps) {
  const queryClient = useQueryClient()
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null)
  const [pipInput, setPipInput] = useState<string>('')
  const [recalculatePast, setRecalculatePast] = useState<boolean>(true)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['symbol-pip-configs'],
    queryFn: async () => {
      const res = await fetch('/api/symbol-pips')
      if (!res.ok) throw new Error('Gagal memuat konfigurasi pip simbol')
      const json = await res.json()
      return json.configs as PipConfigItem[]
    },
    enabled: isOpen,
    staleTime: 10_000,
  })

  const saveMutation = useMutation({
    mutationFn: async ({
      symbol,
      pipSize,
      recalculate,
    }: {
      symbol: string
      pipSize: number
      recalculate: boolean
    }) => {
      const res = await fetch('/api/symbol-pips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          pip_size: pipSize,
          is_confirmed: true,
          recalculate_past: recalculate,
        }),
      })
      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.message || 'Gagal menyimpan konfigurasi pip')
      }
      return res.json()
    },
    onSuccess: () => {
      setEditingSymbol(null)
      queryClient.invalidateQueries({ queryKey: ['symbol-pip-configs'] })
      queryClient.invalidateQueries({ queryKey: ['pips-analytics'] })
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['statistics-analytics'] })
    },
  })

  if (!isOpen) return null

  const handleStartEdit = (item: PipConfigItem) => {
    setEditingSymbol(item.symbol)
    setPipInput(item.pip_size ? String(item.pip_size) : '')
    setRecalculatePast(true)
  }

  const handleSave = (symbol: string) => {
    const num = parseFloat(pipInput)
    if (isNaN(num) || num <= 0) return
    saveMutation.mutate({
      symbol,
      pipSize: num,
      recalculate: recalculatePast,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl p-6 max-w-2xl w-full space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground tracking-tight">
                Konfigurasi Pip Size per Simbol (V7)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Atur dan konfirmasi nilai 1 pip per instrumen untuk menghitung total akumulasi pips secara akurat.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {isLoading && (
            <div className="flex items-center justify-center p-12 text-muted-foreground text-xs gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Memuat konfigurasi pip simbol...</span>
            </div>
          )}

          {isError && (
            <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-center space-y-2">
              <p className="text-xs text-destructive font-medium">Gagal memuat data pip simbol</p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Coba Lagi
              </Button>
            </div>
          )}

          {!isLoading && !isError && data && (
            <>
              {data.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Belum ada simbol yang terekam dari trading Anda. Simbol akan otomatis muncul setelah Anda mencatat/mengimpor trade.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.map((item) => {
                    const isEditing = editingSymbol === item.symbol

                    return (
                      <div
                        key={item.symbol}
                        className={cn(
                          'p-4 rounded-2xl border transition-all space-y-3',
                          item.is_confirmed
                            ? 'bg-card border-border'
                            : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/50'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-extrabold text-foreground bg-muted px-2.5 py-1 rounded-xl">
                              {item.symbol}
                            </span>

                            {item.is_confirmed ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50 flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Dikonfirmasi ✓</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                <span>Belum Dikonfirmasi (Pips Dikecualikan)</span>
                              </span>
                            )}
                          </div>

                          {!isEditing ? (
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-xs font-bold text-foreground">
                                {item.pip_size ? item.pip_size : 'Belum diatur'}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartEdit(item)}
                                className="text-xs font-bold"
                              >
                                {item.is_confirmed ? 'Edit Pip Size' : 'Konfirmasi Pip Size'}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingSymbol(null)}
                              className="text-xs"
                            >
                              Batal
                            </Button>
                          )}
                        </div>

                        {/* Inline Edit Form */}
                        {isEditing && (
                          <div className="pt-3 border-t border-border space-y-3 animate-in fade-in-50">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-1 space-y-1">
                                <label className="block text-[11px] font-semibold text-muted-foreground">
                                  Nilai 1 Pip Size untuk {item.symbol}:
                                </label>
                                <input
                                  type="number"
                                  step="0.000001"
                                  value={pipInput}
                                  onChange={(e) => setPipInput(e.target.value)}
                                  placeholder="Contoh: 0.0001 untuk EURUSD, 0.01 untuk JPY, 0.1 untuk XAUUSD"
                                  className="w-full px-3.5 py-2 bg-muted/40 border border-border rounded-xl text-xs font-mono font-bold text-foreground focus:outline-none focus:border-primary"
                                />
                              </div>

                              <Button
                                size="sm"
                                disabled={saveMutation.isPending || !pipInput}
                                onClick={() => handleSave(item.symbol)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shrink-0 self-end"
                              >
                                {saveMutation.isPending ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                                <span>Simpan &amp; Konfirmasi</span>
                              </Button>
                            </div>

                            {/* Recalculate Past Trades Checkbox */}
                            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none font-medium">
                              <input
                                type="checkbox"
                                checked={recalculatePast}
                                onChange={(e) => setRecalculatePast(e.target.checked)}
                                className="h-4 w-4 rounded accent-primary cursor-pointer"
                              />
                              <span>Hitung ulang pips untuk trade lampau dengan simbol {item.symbol}</span>
                            </label>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
          <span className="flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span>Forex non-JPY = 0.0001 | Forex JPY = 0.01 | Gold (XAUUSD) umumnya 0.1 (cek broker Anda)</span>
          </span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  )
}
