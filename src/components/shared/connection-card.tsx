'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, Trash2, ShieldCheck, Server, Coins, Check, Pencil, Plus } from 'lucide-react'
import { MT5Connection, AccountType } from '@/types/mt5'
import { ConnectionStatusBadge } from '@/components/shared/connection-status-badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'
import { Modal } from '@/components/shared/modal'
import { convertAccountValue } from '@/utils/currency'
import { cn } from '@/lib/utils'

export interface ConnectionCardProps {
  connection: MT5Connection
  onDelete: (id: string) => void
  onSync: (id: string) => void
  onAccountTypeChange?: (id: string, newType: AccountType) => void
  onUpdateBalance?: (connection: MT5Connection) => void
  onAddTrade?: (connection: MT5Connection) => void
}

export function ConnectionCard({
  connection,
  onDelete,
  onSync,
  onAccountTypeChange,
  onUpdateBalance,
  onAddTrade,
}: ConnectionCardProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isUpdatingType, setIsUpdatingType] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [accountType, setAccountType] = useState<AccountType>(
    connection.accountType || connection.account_type || 'standard'
  )

  const isManual = connection.platform === 'manual'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`mt5_account_type_${connection.id}`)
      if (saved === 'cent' || saved === 'standard') {
        setAccountType(saved as AccountType)
      } else if (connection.accountType || connection.account_type) {
        setAccountType(connection.accountType || connection.account_type || 'standard')
      }
    }
  }, [connection.id, connection.accountType, connection.account_type])

  const handleSyncClick = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      onSync(connection.id)
      toast(`Tampilan disinkronkan untuk akun ${connection.accountNumber || connection.brokerName || ''}`, 'success')
    }, 1000)
  }

  const handleAccountTypeSelect = async (newType: AccountType) => {
    if (newType === accountType) return
    setIsUpdatingType(true)
    setAccountType(newType)

    if (typeof window !== 'undefined') {
      localStorage.setItem(`mt5_account_type_${connection.id}`, newType)
    }

    try {
      const res = await fetch(`/api/mt5/connections/${connection.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType: newType }),
      })

      if (res.ok) {
        toast(
          `Tipe akun diubah ke ${newType === 'cent' ? 'Akun Cent (USC)' : 'Akun Standar (USD)'}`,
          'success'
        )
        onAccountTypeChange?.(connection.id, newType)
      } else {
        toast('Tipe akun disimpan lokal (localStorage)', 'info')
      }
    } catch {
      toast('Tipe akun disimpan lokal (localStorage)', 'info')
    } finally {
      setIsUpdatingType(false)
    }
  }

  const handleDeleteConfirm = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`mt5_account_type_${connection.id}`)
    }
    setIsDeleteModalOpen(false)
    onDelete(connection.id)
    toast('Koneksi akun telah dihapus', 'error')
  }

  const rawBalance = connection.currentBalance || 0
  const isCent = accountType === 'cent'
  const converted = convertAccountValue(rawBalance, accountType)

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5 shadow-md flex flex-col justify-between gap-4 transition-all hover:border-primary/40">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              isManual ? "bg-purple-500/15 text-purple-400" : "bg-secondary text-primary"
            )}>
              {isManual ? <Pencil className="h-5 w-5" /> : <Server className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-foreground text-base tracking-tight truncate">
                {isManual
                  ? (connection.brokerName || 'Akun Manual')
                  : (connection.accountNumber ? `#${connection.accountNumber}` : 'Menunggu Akun')}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className={cn(
                  'text-[9px] font-mono font-black px-1.5 py-0.5 rounded-md border shrink-0',
                  (connection.platform === 'mt4')
                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                    : isManual
                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                    : 'bg-primary/15 text-primary border-primary/30'
                )}>
                  {(connection.platform || 'mt5').toUpperCase()}
                </span>
                {!isManual && (
                  <p className="text-xs text-muted-foreground font-medium truncate">
                    {connection.brokerName || 'Broker Belum Terdeteksi'}
                  </p>
                )}
                {isCent && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                    Cent (USC)
                  </span>
                )}
              </div>
            </div>
          </div>

          {isManual ? (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 shrink-0">
              Manual Active
            </span>
          ) : (
            <ConnectionStatusBadge
              status={connection.status}
              errorMessage={connection.lastError}
              lastSyncedAt={connection.lastSyncedAt}
            />
          )}
        </div>

        {/* Saldo Realtime & Conversion Badge */}
        <div className="bg-muted/40 border border-border/60 rounded-xl p-3 text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
              {isManual ? 'Saldo Terkini:' : 'Saldo Realtime:'}
            </span>
            <span className="font-mono font-extrabold text-sm text-emerald-400">
              {isCent ? `${rawBalance.toLocaleString('en-US')} USC` : `$${rawBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </span>
          </div>

          {isCent && (
            <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[11px]">
              <span className="text-muted-foreground">Konversi Riil USD ($):</span>
              <span className="font-mono font-bold text-emerald-400">
                ${converted.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </span>
            </div>
          )}
        </div>

        {/* Pemilih Tipe Akun (Standar USD vs Cent USC) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-amber-500" /> Tipe Akun Trading:
          </label>

          <div className="grid grid-cols-2 gap-2 bg-muted/30 p-1 rounded-xl border border-border/60">
            <button
              type="button"
              disabled={isUpdatingType}
              onClick={() => handleAccountTypeSelect('standard')}
              className={cn(
                'py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1',
                accountType === 'standard'
                  ? 'bg-background text-foreground shadow-xs border border-border/40 font-extrabold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {accountType === 'standard' && <Check className="h-3 w-3 text-primary" />}
              <span>Standar (USD)</span>
            </button>

            <button
              type="button"
              disabled={isUpdatingType}
              onClick={() => handleAccountTypeSelect('cent')}
              className={cn(
                'py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1',
                accountType === 'cent'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-extrabold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {accountType === 'cent' && <Check className="h-3 w-3 text-amber-400" />}
              <span>Cent (USC)</span>
            </button>
          </div>
          {isCent && (
            <p className="text-[10px] text-amber-400/90 font-medium px-1">
              💡 Pada akun Cent, 100 USC = $1.00 USD (otomatis dikonversi /100 untuk target compounding).
            </p>
          )}
        </div>

        {/* Info detail */}
        <div className="bg-muted/30 border border-border/50 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Tipe Koneksi:</span>
            <span className="text-foreground font-semibold flex items-center gap-1 text-[11px]">
              {isManual ? (
                <>
                  <Pencil className="h-3.5 w-3.5 text-purple-400" /> Manual Entry
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-profit" /> Token SHA-256
                </>
              )}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Dibuat Pada:</span>
            <span className="text-foreground font-medium">
              {new Date(connection.createdAt).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/60">
          {isManual ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 text-xs font-bold"
                onClick={() => onUpdateBalance?.(connection)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1 shrink-0" />
                Update Balance
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold text-primary border-primary/40 hover:bg-primary/10"
                onClick={() => onAddTrade?.(connection)}
              >
                <Plus className="h-3.5 w-3.5 mr-1 shrink-0" />
                Trade
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleSyncClick}
              isLoading={isSyncing}
              disabled={connection.status === 'pending'}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              Sync Sekarang
            </Button>
          )}

          <Button
            variant="danger"
            size="sm"
            className="px-3"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Delete Modal Confirmation */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Hapus Koneksi Trading?"
        description={`Apakah Anda yakin ingin menghapus akun "${connection.brokerName || connection.accountNumber || 'ini'}"? ${isManual ? 'Semua riwayat trade yang terkait tetap tersimpan.' : 'Token API akan langsung dicabut.'}`}
      >
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Ya, Hapus Koneksi
          </Button>
        </div>
      </Modal>
    </>
  )
}
