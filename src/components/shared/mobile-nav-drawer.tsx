'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  X,
  LayoutDashboard,
  BookOpen,
  Calculator,
  BarChart3,
  Lightbulb,
  Brain,
  Target,
  FileText,
  Link2,
  Settings,
  ShieldCheck,
  Sun,
  Moon,
  LogOut,
  AlertCircle
} from 'lucide-react'

import { useThemeStore } from '@/store/theme-store'
import { createClient } from '@/services/supabase/client'
import { cn } from '@/lib/utils'

export interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const mainNavItems = [
  { href: '/dashboard',   label: 'Dashboard',            icon: LayoutDashboard },
  { href: '/trades',      label: 'Jurnal Trading',       icon: BookOpen },
  { href: '/compounding', label: 'Target & Compounding', icon: Calculator },
  { href: '/statistics',  label: 'Statistik',            icon: BarChart3 },
  { href: '/analysis',    label: 'Analisis',             icon: Lightbulb },
]

const journalNavItems = [
  { href: '/psychology',  label: 'Psikologi Trading', icon: Brain },
  { href: '/strategies',  label: 'Strategi',          icon: Target },
  { href: '/notes',       label: 'Catatan',           icon: FileText },
]

const systemNavItems = [
  { href: '/mt5',         label: 'Import / MT5',      icon: Link2 },
  { href: '/settings',    label: 'Pengaturan',        icon: Settings },
]

export function MobileNavDrawer({ isOpen, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname()
  const { theme, toggleTheme } = useThemeStore()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isJournalFilledToday, setIsJournalFilledToday] = useState<boolean | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.role === 'admin') {
              setIsAdmin(true)
            }
          })

        const todayStr = new Date().toISOString().slice(0, 10)
        Promise.all([
          supabase.from('trades').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('open_time', `${todayStr}T00:00:00.000Z`),
          supabase.from('daily_psychology_logs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('log_date', todayStr),
        ]).then(([tradeRes, logRes]) => {
          const tradeCount = tradeRes.count ?? 0
          const logCount = logRes.count ?? 0
          setIsJournalFilledToday(tradeCount > 0 || logCount > 0)
        }).catch(() => {
          setIsJournalFilledToday(true)
        })
      }
    })
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative z-10 w-[290px] max-w-[85vw] h-full bg-card border-r border-border p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 select-none">
        {/* Top Branding & Close Button */}
        <div>
          <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-border/80">
            <Link href="/dashboard" onClick={onClose} className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-9 w-9 flex items-center justify-center shrink-0 relative">
                <Image
                  src="/logoNoBg.png"
                  alt="Logo"
                  width={32}
                  height={32}
                  className="object-contain dark:invert"
                  priority
                />
              </div>
              <div className="truncate">
                <h2 className="font-extrabold text-xs leading-tight text-foreground truncate">
                  Catatan Harian
                </h2>
                <span className="text-[10px] text-primary font-bold tracking-wider uppercase block">
                  Trader Forex
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              aria-label="Tutup Menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Daily Journal Warning Banner */}
          {isJournalFilledToday === false && (
            <Link
              href="/trades"
              onClick={onClose}
              className="flex items-center gap-2 w-full px-3 py-2 mb-3 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all shadow-2xs"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="truncate">⚠️ Belum isi jurnal hari ini</span>
            </Link>
          )}

          {/* Navigation Links Grouped */}
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-210px)] pr-1 scrollbar-thin">
            {/* Group 1: Navigasi Utama */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-2 mb-1.5">
                Utama
              </span>
              <div className="space-y-0.5">
                {mainNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Group 2: Jurnal & Strategi */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-2 mb-1.5">
                Jurnal &amp; Strategi
              </span>
              <div className="space-y-0.5">
                {journalNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Group 3: Sistem & Pengaturan */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block px-2 mb-1.5">
                Sistem &amp; Akun
              </span>
              <div className="space-y-0.5">
                {systemNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}

                {isAdmin && (
                  <Link
                    href="/admin/dashboard"
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Portal Admin</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions: Theme Toggle & Logout */}
        <div className="pt-3 border-t border-border/80 space-y-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl border border-border bg-muted/20 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <span>Tema {theme === 'dark' ? 'Gelap' : 'Terang'}</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">
              Toggle
            </span>
          </button>

          <button
            type="button"
            onClick={async () => {
              onClose()
              const isSupabaseConfigured =
                process.env.NEXT_PUBLIC_SUPABASE_URL &&
                process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'
              if (isSupabaseConfigured) {
                const { createClient } = await import('@/services/supabase/client')
                const supabase = createClient()
                await supabase.auth.signOut()
              }
              window.location.href = '/login'
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Keluar / Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}
