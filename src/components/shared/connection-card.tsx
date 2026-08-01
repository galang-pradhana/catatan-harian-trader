'use client'

import React, { useState } from 'react'
import { RefreshCw, Trash2, ShieldCheck, Server } from 'lucide-react'
import { MT5Connection } from '@/types/mt5'
import { ConnectionStatusBadge } from '@/components/shared/connection-status-badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'
import { Modal } from '@/components/shared/modal'

export interface ConnectionCardProps {
  connection: MT5Connection
  onDelete: (id: string) => void
  onSync: (id: string) => void
}

export function ConnectionCard({
  connection,
  onDelete,
  onSync,
}: ConnectionCardProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const handleSyncClick = () => {
    setIsSyncing(true)
    setTimeout(() => {
      setIsSyncing(false)
      onSync(connection.id)
      toast(`Tampilan disinkronkan untuk akun MT5 ${connection.accountNumber || ''}`, 'success')
    }, 1000)
  }

  const handleDeleteConfirm = () => {
    setIsDeleteModalOpen(false)
    onDelete(connection.id)
    toast('Koneksi MT5 telah dihapus', 'error')
  }

  return (
    <>
      <div className="bg-card border border-border rounded-2xl p-5 shadow-md flex flex-col justify-between gap-4 transition-all hover:border-primary/40">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base tracking-tight">
                {connection.accountNumber ? `#${connection.accountNumber}` : 'Menunggu Akun'}
              </h3>
              <p className="text-xs text-muted-foreground font-medium">
                {connection.brokerName || 'Broker Belum Terdeteksi'}
              </p>
            </div>
          </div>
          <ConnectionStatusBadge
            status={connection.status}
            errorMessage={connection.lastError}
            lastSyncedAt={connection.lastSyncedAt}
          />
        </div>

        {/* Info detail */}
        <div className="bg-muted/30 border border-border/50 rounded-xl p-3 text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Protokol Keamanan:</span>
            <span className="text-foreground font-semibold flex items-center gap-1 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-profit" /> Token SHA-256
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
        title="Putuskan Koneksi MT5?"
        description={`Apakah Anda yakin ingin memutus koneksi akun #${connection.accountNumber || 'ini'}? Token API akan langsung dicabut dan EA di MT5 tidak akan dapat mengirim data.`}
      >
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Ya, Putuskan Koneksi
          </Button>
        </div>
      </Modal>
    </>
  )
}
