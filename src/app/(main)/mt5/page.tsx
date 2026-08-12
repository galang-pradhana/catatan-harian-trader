'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Server, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react'
import { MT5Connection } from '@/types/mt5'
import { MAX_MT5_CONNECTIONS_PER_USER } from '@/constants/mt5'
import { ConnectionCard } from '@/components/shared/connection-card'
import { NewConnectionModal } from '@/components/shared/new-connection-modal'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/shared/toast'

export default function MT5Page() {
  const [connections, setConnections] = useState<MT5Connection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchConnections = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/mt5/connections')
      if (!res.ok) {
        throw new Error('Gagal mengambil daftar koneksi MT5')
      }
      const data = await res.json()
      setConnections(data.connections || [])
    } catch (err: any) {
      toast(err?.message || 'Gagal memuat koneksi', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const isLimitReached = connections.length >= MAX_MT5_CONNECTIONS_PER_USER

  const handleSync = async (id: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, lastSyncedAt: 'Baru saja' } : c
      )
    )
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/mt5/connections/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== id))
        toast('Koneksi MT5 berhasil dihapus', 'success')
      } else {
        toast('Gagal menghapus koneksi dari server', 'error')
      }
    } catch (err: any) {
      toast('Gagal memproses penghapusan koneksi', 'error')
    }
  }

  const handleConnectionCreated = () => {
    setIsModalOpen(false)
    fetchConnections()
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Hubungkan MT4 / MT5</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary font-semibold text-primary border border-border">
              {connections.length} / {MAX_MT5_CONNECTIONS_PER_USER} Akun
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Hubungkan MetaTrader 4 atau MetaTrader 5 via Expert Advisor (EA) tanpa memasukkan kredensial broker.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConnections}
            isLoading={isLoading}
            title="Refresh Koneksi"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.href = '/mt5/import'}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Import CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            disabled={isLimitReached}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Buat Koneksi Baru
          </Button>
        </div>
      </div>

      {/* Limit Alert if Reached */}
      {isLimitReached && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-center gap-3 text-xs text-amber-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Batas maksimal {MAX_MT5_CONNECTIONS_PER_USER} koneksi trading telah tercapai per akun. Hapus salah satu koneksi untuk menambahkan koneksi baru.
          </span>
        </div>
      )}

      {/* Connection List Grid */}
      {connections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {connections.map((conn) => (
            <ConnectionCard
              key={conn.id}
              connection={conn}
              onSync={handleSync}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-card border border-border rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center text-muted-foreground">
            <Server className="h-8 w-8 text-primary" />
          </div>
          <div className="max-w-sm space-y-1">
            <h3 className="text-lg font-bold text-foreground">
              Belum Ada Koneksi Trading
            </h3>
            <p className="text-xs text-muted-foreground">
              Hubungkan terminal MetaTrader 4 atau 5 Anda untuk mulai membaca closed trade history & posisi terbuka secara otomatis.
            </p>
          </div>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Buat Koneksi Pertama Anda
          </Button>
        </div>
      )}

      {/* New Connection Modal */}
      <NewConnectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConnectionCreated={handleConnectionCreated}
      />
    </div>
  )
}
