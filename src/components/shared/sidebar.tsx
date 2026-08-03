'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  BarChart3,
  Lightbulb,
  Brain,
  Calculator,
  Target,
  FileText,
  Trophy,
  Bell,
  Link2,
  Settings,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Crown,
  ShieldCheck,
} from 'lucide-react'

import { useThemeStore } from '@/store/theme-store'
import { useSidebarStore } from '@/store/sidebar-store'
import { cn } from '@/lib/utils'
import { createClient } from '@/services/supabase/client'

export const navItems = [
  { href: '/dashboard',   label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/trades',      label: 'Jurnal Trading',    icon: BookOpen },
  { href: '/calendar',    label: 'Kalender',          icon: Calendar },
  { href: '/compounding', label: 'Compounding',       icon: Calculator },
  { href: '/statistics',  label: 'Statistik',         icon: BarChart3 },
  { href: '/analysis',    label: 'Analisis',          icon: Lightbulb },
  { href: '/psychology',  label: 'Psikologi Trading', icon: Brain },
  { href: '/strategies',  label: 'Strategi',          icon: Target },
  { href: '/notes',       label: 'Catatan',           icon: FileText },
  { href: '/goals',       label: 'Tujuan',            icon: Trophy },
  { href: '/reminders',   label: 'Pengingat',         icon: Bell },
  { href: '/mt5',         label: 'Import / MT5',      icon: Link2 },
  { href: '/settings',    label: 'Pengaturan',        icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useThemeStore()
  const { isCollapsed, toggleSidebar } = useSidebarStore()
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
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
      }
    })
  }, [])

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border bg-card p-3.5 h-screen sticky top-0 transition-all duration-300 z-30 select-none',
        isCollapsed ? 'w-20 items-center' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          'flex items-center justify-between gap-3 px-2 py-3 mb-4 border-b border-border/60 w-full',
          isCollapsed && 'flex-col justify-center px-0'
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 flex items-center justify-center shrink-0 relative group">
            <Image
              src="/logoNoBg.png"
              alt="Catatan Harian Trader Logo"
              width={36}
              height={36}
              className="object-contain dark:invert transition-transform group-hover:scale-105"
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <h1 className="font-extrabold text-sm leading-tight text-foreground truncate">
                Catatan Harian
              </h1>
              <span className="text-[11px] text-primary font-bold tracking-wider uppercase block">
                Trader Forex
              </span>
            </div>
          )}
        </Link>

        {/* Toggle Collapse Button */}
        <button
          onClick={toggleSidebar}
          title={isCollapsed ? 'Buka Sidebar' : 'Sembunyikan Sidebar'}
          className={cn(
            'p-1.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0',
            isCollapsed && 'mt-1'
          )}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4 text-primary" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1 w-full overflow-y-auto pr-0.5 scrollbar-thin">

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all duration-150',
                isCollapsed && 'justify-center px-0 py-3',
                isActive
                  ? 'bg-primary text-primary-foreground font-bold shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Theme Toggle & Logout Footer */}
      <div className="pt-3 border-t border-border/60 w-full space-y-2">
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            title={isCollapsed ? 'Portal Admin' : undefined}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20 transition-colors cursor-pointer',
              isCollapsed && 'justify-center px-0'
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0 text-amber-500" />
            {!isCollapsed && <span>Portal Admin</span>}
          </Link>
        )}

        <button
          onClick={toggleTheme}
          title={`Ganti ke Tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
          className={cn(
            'flex items-center justify-between w-full px-3 py-2.5 rounded-xl border border-border bg-muted/20 text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <span className="flex items-center gap-2.5">
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 text-primary shrink-0" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500 shrink-0" />
            )}
            {!isCollapsed && <span>{theme === 'dark' ? 'Gelap' : 'Terang'}</span>}
          </span>
          {!isCollapsed && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-card border border-border text-muted-foreground">
              Toggle
            </span>
          )}
        </button>

        <button
          onClick={async () => {
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
          title={isCollapsed ? 'Keluar' : undefined}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Keluar / Logout</span>}
        </button>
      </div>
    </aside>
  )
}

