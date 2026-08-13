'use client'

import React, { useState, useEffect } from 'react'
import { DollarSign, Coins, TrendingUp } from 'lucide-react'
import { Modal } from '@/components/shared/modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'
import { AccountType } from '@/types/mt5'

interface UpdateBalanceModalProps {
  isOpen: boolean
  onClose: () => void
  connectionId: string
  accountName: string
  currentBalance?: number
  accountType?: AccountType
  onBalanceUpdated: () => void
}

export function UpdateBalanceModal({
  isOpen,
  onClose,
  connectionId,
  accountName,
  currentBalance = 0,
  accountType = 'standard',
  onBalanceUpdated,
}: UpdateBalanceModalProps) {
  const [balanceInput, setBalanceInput] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setBalanceInput(currentBalance ? String(currentBalance) : '')
    }
  }, [isOpen, currentBalance])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = Number(balanceInput)
    if (isNaN(val) || val < 0) {
      toast('Masukkan jumlah saldo yang valid (>= 0)', 'error')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`/api/mt5/connections/${connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentBalance: val }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Gagal memperbarui saldo')
      }

      toast('Saldo akun berhasil diperbarui & dicatat ke snapshot!', 'success')
      onBalanceUpdated()
      onClose()
    } catch (err: any) {
      toast(err?.message || 'Gagal memperbarui saldo', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const isCent = accountType === 'cent'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Saldo Akun Manual"
      description={`Perbarui balance terkini untuk "${accountName}". Data ini akan dicatat ke grafik Drawdown.`}
      className="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 my-2">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground flex items-center justify-between">
            <span>Saldo Terkini ({isCent ? 'USC' : 'USD'}):</span>
            {isCent && (
              <span className="text-[10px] text-amber-400 font-normal">Akun Cent</span>
            )}
          </label>

          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              {isCent ? <Coins className="h-4 w-4 text-amber-400" /> : <DollarSign className="h-4 w-4 text-primary" />}
            </div>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              placeholder={isCent ? '1000000 (USC)' : '10000.00 (USD)'}
              className="w-full h-11 rounded-xl border border-border bg-background pl-10 pr-4 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
          {isCent && Number(balanceInput) > 0 && (
            <p className="text-[11px] text-amber-400/90 font-medium pt-1">
              💡 Saldo setara USD: ${(Number(balanceInput) / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </p>
          )}
        </div>

        <div className="bg-muted/40 border border-border/60 p-3 rounded-xl flex items-start gap-2.5 text-xs text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Setiap perubahan balance manual akan secara otomatis membuat snapshot saldo baru untuk melacak perkembangan equity &amp; drawdown portofolio Anda.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Batal
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Simpan Saldo
          </Button>
        </div>
      </form>
    </Modal>
  )
}
