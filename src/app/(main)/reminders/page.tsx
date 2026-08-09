'use client'

/**
 * Reminder feature — disabled for V1, revisit after infrastructure supports custom push notifications / scheduled cron jobs.
 * 
 * Note: Vercel Hobby plan limitations prevent custom per-user scheduled cron triggers.
 * Client-side journal status warnings have been added to the sidebar / dashboard as a lightweight alternative.
 */

import React from 'react'
import Link from 'next/link'
import { BellOff, ArrowLeft, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RemindersPageDisabled() {
  return (
    <div className="max-w-2xl mx-auto py-12 space-y-6 text-center">
      <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 space-y-5 shadow-lg">
        <div className="h-16 w-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500">
          <BellOff className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-foreground">
            Fitur Pengingat Dinonaktifkan Sementara (V1)
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Untuk menjaga stabilitas dan performa aplikasi pada versi V1, fitur notifikasi pengingat terjadwal dinonaktifkan sementara. Sebagai gantinya, status pengisian jurnal harian ditampilkan secara otomatis pada sidebar navigasi.
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="primary" size="sm" className="font-bold text-xs">
              <LayoutDashboard className="h-4 w-4 mr-1.5" /> Kembali ke Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
