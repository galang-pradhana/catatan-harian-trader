'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, Moon, Sun } from 'lucide-react'
import { Sidebar } from '@/components/shared/sidebar'
import { MobileNavDrawer } from '@/components/shared/mobile-nav-drawer'
import { useThemeStore } from '@/store/theme-store'
import { useRouter } from 'next/navigation'

// ─── Kunci untuk remember me session guard ───────────────────────
const REMEMBER_ME_KEY = 'chtrader_remember_me'
const SESSION_ONLY_KEY = 'chtrader_session_only'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const { theme, toggleTheme } = useThemeStore()
  const router = useRouter()

  // ─── Session Guard: auto sign-out jika "Remember Me" dinonaktifkan ──
  // Jika user login TANPA remember me, sessionStorage akan berisi SESSION_ONLY_KEY.
  // Saat browser ditutup & dibuka ulang, sessionStorage bersih → otomatis sign out.
  useEffect(() => {
    const checkSessionGuard = async () => {
      try {
        const rememberMe = localStorage.getItem(REMEMBER_ME_KEY)
        const sessionActive = sessionStorage.getItem(SESSION_ONLY_KEY)

        // Hanya jalankan jika user memilih "session only" (remember me = false)
        if (rememberMe === 'false' && !sessionActive) {
          // sessionStorage kosong = browser restart → sign out
          const { createClient } = await import('@/services/supabase/client')
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            await supabase.auth.signOut()
            localStorage.removeItem(REMEMBER_ME_KEY)
            router.replace('/login')
          }
        }
      } catch {
        // Gagal silent — tidak block UI
      }
    }

    checkSessionGuard()
  }, [router])

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar (>= md) */}
      <Sidebar />

      {/* Mobile Navigation Drawer Overlay (< md) */}
      <MobileNavDrawer
        isOpen={isNavOpen}
        onClose={() => setIsNavOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Global Mobile Top Header Bar (< md) */}
        <header className="md:hidden sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/80 px-3.5 py-2.5 flex items-center justify-between shadow-2xs select-none">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* 1 Hamburger Menu Button (Garis 3) */}
            <button
              type="button"
              onClick={() => setIsNavOpen(true)}
              className="p-2 rounded-xl border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0 shadow-2xs"
              aria-label="Buka Menu Navigasi"
              title="Buka Navigasi App"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>

            {/* App Logo & Brand Title */}
            <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
              <div className="h-7 w-7 relative shrink-0">
                <Image
                  src="/logoNoBg.png"
                  alt="Logo"
                  width={28}
                  height={28}
                  className="object-contain dark:invert"
                  priority
                />
              </div>
              <div className="truncate">
                <span className="font-extrabold text-xs text-foreground block leading-tight truncate">
                  Catatan Harian
                </span>
                <span className="text-[9px] text-primary font-extrabold tracking-wider uppercase block">
                  Trader Forex
                </span>
              </div>
            </Link>
          </div>

          {/* Right Action: Quick Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-border bg-background text-foreground hover:bg-muted active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
            title={`Ganti ke Tema ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
          >
            {theme === 'dark' ? (
              <Moon className="h-4 w-4 text-primary" />
            ) : (
              <Sun className="h-4 w-4 text-amber-500" />
            )}
          </button>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 pb-8 p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
