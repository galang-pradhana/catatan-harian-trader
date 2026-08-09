'use client'

import React from 'react'
import Link from 'next/link'
import { Clock, ShieldAlert, LogOut, Mail, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OnboardingPendingPage() {
  const handleLogout = async () => {
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    if (isSupabaseConfigured) {
      const { createClient } = await import('@/services/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-8 shadow-2xl space-y-6 text-center animate-in fade-in-50 zoom-in-95">
        {/* Animated Badge */}
        <div className="h-20 w-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-500 shadow-sm relative">
          <Clock className="h-10 w-10 animate-pulse" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-amber-400 rounded-full animate-ping" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-block">
            Status Akun: Menunggu Approval Admin
          </span>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">
            Pendaftaran Berhasil Diverifikasi!
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed pt-1">
            Akun kamu sedang diverifikasi oleh admin. Kamu akan mendapat notifikasi email begitu akun aktif (biasanya dalam 1x24 jam).
          </p>
        </div>

        {/* Feature status list */}
        <div className="bg-muted/20 border border-border rounded-2xl p-4 text-left space-y-2.5 text-xs font-medium">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Verifikasi Email</span>
            </span>
            <span className="text-emerald-400 font-bold text-[10px]">Selesai</span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground border-t border-border/40 pt-2">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Persetujuan Admin</span>
            </span>
            <span className="text-amber-400 font-bold text-[10px] animate-pulse">Menunggu (Pending)</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 space-y-3">
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full font-bold text-xs hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-1.5" /> Keluar / Logout
          </Button>

          <p className="text-[11px] text-muted-foreground">
            Ada pertanyaan? Hubungi tim support kami via <a href="mailto:support@chtrader.com" className="text-primary font-bold hover:underline">support@chtrader.com</a>
          </p>
        </div>
      </div>
    </div>
  )
}
