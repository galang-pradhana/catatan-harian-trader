'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/toast'
import { Modal } from '@/components/shared/modal'
import { ConnectionStatusBadge } from '@/components/shared/connection-status-badge'
import { useThemeStore } from '@/store/theme-store'
import { Sun, Moon } from 'lucide-react'

export default function PreviewPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoadingBtn, setIsLoadingBtn] = useState(false)
  const { theme, toggleTheme } = useThemeStore()

  const handleSimulateLoading = () => {
    setIsLoadingBtn(true)
    setTimeout(() => {
      setIsLoadingBtn(false)
      toast('Aksi berhasil dilakukan!', 'success')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-4xl mx-auto space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Design System & Components Preview
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Catatan Harian Trader — Sprint S-00 Component Shell
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 mr-2 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 mr-2 text-primary" />
          )}
          Mode {theme === 'dark' ? 'Terang' : 'Gelap'}
        </Button>
      </div>

      {/* 1. Buttons */}
      <section className="space-y-4 p-6 rounded-2xl bg-card border border-border">
        <h2 className="text-lg font-semibold text-foreground">
          1. Tombol (Button Variants & States)
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary (Gold)</Button>
          <Button variant="secondary">Secondary (Border Accent)</Button>
          <Button variant="danger">Danger (Red)</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link Button</Button>
        </div>

        <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="default">
            Default (44px min-h)
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
          <Button
            variant="primary"
            isLoading={isLoadingBtn}
            onClick={handleSimulateLoading}
          >
            Simulasi Loading
          </Button>
          <Button variant="primary" disabled>
            Disabled (40%)
          </Button>
        </div>
      </section>

      {/* 2. Inputs */}
      <section className="space-y-4 p-6 rounded-2xl bg-card border border-border">
        <h2 className="text-lg font-semibold text-foreground">
          2. Input Field (Form States)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Default Input" placeholder="Masukkan text..." />
          <Input
            label="Focus / Active Input"
            placeholder="Ketik untuk focus state..."
            helperText="Garis tepi akan berwarna gold saat diketik"
          />
          <Input
            label="Success State"
            value="user@example.com"
            success
            readOnly
            helperText="Validasi email berhasil"
          />
          <Input
            label="Error State"
            value="invalid-email"
            error="Format email tidak valid"
            readOnly
          />
          <Input
            label="Disabled Input"
            placeholder="Tidak dapat diketik..."
            disabled
          />
        </div>
      </section>

      {/* 3. Toast Notifications */}
      <section className="space-y-4 p-6 rounded-2xl bg-card border border-border">
        <h2 className="text-lg font-semibold text-foreground">
          3. Toast Feedback Notifications
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => toast('Koneksi MT5 berhasil disimpan!', 'success')}
          >
            Toast Success
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() =>
              toast('Email atau password salah. Silakan coba lagi.', 'error')
            }
          >
            Toast Error
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              toast('Informasi: Sesi Anda aktif selama 7 hari.', 'info')
            }
          >
            Toast Info
          </Button>
        </div>
      </section>

      {/* 4. Connection Status Badges */}
      <section className="space-y-4 p-6 rounded-2xl bg-card border border-border">
        <h2 className="text-lg font-semibold text-foreground">
          4. Badge Status Koneksi MT5
        </h2>
        <div className="flex flex-wrap items-start gap-6">
          <div>
            <span className="text-xs text-muted-foreground block mb-2">
              Connected
            </span>
            <ConnectionStatusBadge
              status="connected"
              lastSyncedAt="5 menit lalu"
            />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-2">
              Pending
            </span>
            <ConnectionStatusBadge status="pending" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-2">
              Error
            </span>
            <ConnectionStatusBadge
              status="error"
              errorMessage="Token tidak valid atau sudah dicabut"
            />
          </div>
        </div>
      </section>

      {/* 5. Modal Dialog */}
      <section className="space-y-4 p-6 rounded-2xl bg-card border border-border">
        <h2 className="text-lg font-semibold text-foreground">
          5. Modal Dialog
        </h2>
        <Button variant="danger" onClick={() => setIsModalOpen(true)}>
          Buka Modal Konfirmasi
        </Button>
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Hapus Koneksi MT5?"
          description="Aksi ini tidak dapat dibatalkan. Token API akan dicabut dan EA di MT5 tidak akan bisa mengirim data lagi."
        >
          <div className="flex items-center justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setIsModalOpen(false)
                toast('Koneksi MT5 telah dihapus.', 'error')
              }}
            >
              Ya, Hapus Koneksi
            </Button>
          </div>
        </Modal>
      </section>
    </div>
  )
}
