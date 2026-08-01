'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '@/store/theme-store'
import { Button } from '@/components/ui/button'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-screen w-full flex bg-background relative overflow-hidden select-none">
      {/* Theme Toggle Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground bg-card/60 backdrop-blur-md border border-border/50"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 mr-1.5 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 mr-1.5 text-primary" />
          )}
          <span className="text-xs">Mode {theme === 'dark' ? 'Terang' : 'Gelap'}</span>
        </Button>
      </div>

      {/* LEFT COLUMN: Dark Atmospheric Hero Banner (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 bg-gradient-to-b from-[#080B0F] via-[#0E131A] to-[#06080B] border-r border-border/40 overflow-hidden">
        {/* Subtle Background Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-profit/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-card/80 border border-border p-1.5 flex items-center justify-center shadow-lg backdrop-blur-md">
            <Image
              src="/logo.png"
              alt="Catatan Harian Trader Logo"
              width={38}
              height={38}
              className="object-contain invert"
              priority
            />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-wider text-white uppercase block">
              CATATAN HARIAN TRADER
            </span>
            <span className="text-[10px] text-primary font-semibold tracking-widest uppercase block">
              Automated Forex Journal & MT5 Sync
            </span>
          </div>
        </div>

        {/* Center Graphic & Tagline */}
        <div className="relative z-10 my-auto py-12 max-w-lg space-y-6">
          {/* Logo Line Art Showcase Badge */}
          <div className="w-24 h-24 rounded-3xl bg-card/40 border border-border/60 backdrop-blur-xl p-3 flex items-center justify-center shadow-2xl mb-6">
            <Image
              src="/logo.png"
              alt="Fox Logo Badge"
              width={72}
              height={72}
              className="object-contain invert opacity-90"
            />
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Enter Your <br />
            <span className="bg-gradient-to-r from-primary via-amber-300 to-amber-500 bg-clip-text text-transparent">
              Flow State.
            </span>
          </h1>

          <p className="text-sm text-slate-300/80 leading-relaxed font-light">
            Jurnal trading forex otomatis MetaTrader 5 yang dirancang untuk membangun kedisiplinan, kejelasan analitik, dan konsistensi evaluasi trading Anda.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-white/10 pt-4">
          <span>© 2026 Catatan Harian Trader</span>
          <span>v1.0 MVP Edition</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Form Container */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo Header */}
          <div className="flex lg:hidden items-center gap-3 justify-center mb-4">
            <div className="h-10 w-10 rounded-xl bg-card border border-border p-1 flex items-center justify-center shadow-md">
              <Image
                src="/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="object-contain dark:invert"
              />
            </div>
            <div>
              <span className="font-bold text-sm text-foreground uppercase block">
                Catatan Harian Trader
              </span>
              <span className="text-[10px] text-primary font-semibold tracking-wider">
                MT5 Forex Journal
              </span>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
