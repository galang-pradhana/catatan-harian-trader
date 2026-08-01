'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  KeyRound,
  Sun,
  Moon,
  LogOut,
  Save,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import { useThemeStore } from '@/store/theme-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/toast'
import { createClient } from '@/services/supabase/client'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useThemeStore()

  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false)

  useEffect(() => {
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    setIsSupabaseConfigured(Boolean(isConfigured))

    if (isConfigured) {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setEmail(user.email || '')
          setDisplayName(user.user_metadata?.display_name || user.email?.split('@')[0] || '')
        }
      })
    } else {
      // Demo defaults
      setEmail('trader.demo@catatanharian.com')
      setDisplayName('Pro Trader Demo')
    }
  }, [])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) {
      toast('Nama tampilan tidak boleh kosong', 'error')
      return
    }

    setIsUpdatingProfile(true)

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({
          data: { display_name: displayName },
        })

        if (error) throw error
        toast('Profil berhasil diperbarui!', 'success')
      } catch (err: any) {
        toast(err.message || 'Gagal memperbarui profil', 'error')
      } finally {
        setIsUpdatingProfile(false)
      }
    } else {
      setTimeout(() => {
        setIsUpdatingProfile(false)
        toast('Profil berhasil diperbarui (Demo Mode)', 'success')
      }, 500)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      toast('Password baru minimal 8 karakter', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      toast('Konfirmasi password tidak cocok', 'error')
      return
    }

    setIsChangingPassword(true)

    if (isSupabaseConfigured) {
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (error) throw error
        toast('Password berhasil diubah!', 'success')
        setNewPassword('')
        setConfirmPassword('')
      } catch (err: any) {
        toast(err.message || 'Gagal mengubah password', 'error')
      } finally {
        setIsChangingPassword(false)
      }
    } else {
      setTimeout(() => {
        setIsChangingPassword(false)
        toast('Password berhasil diubah (Demo Mode)', 'success')
        setNewPassword('')
        setConfirmPassword('')
      }, 500)
    }
  }

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    toast('Anda telah logout', 'info')
    router.push('/login')
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold text-foreground">Pengaturan Akun</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Kelola profil pengguna, keamanan kata sandi, dan preferensi tampilan.
        </p>
      </div>

      {/* SECTION 1: Profil Pengguna */}
      <form onSubmit={handleUpdateProfile} className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
          <User className="h-5 w-5 text-primary" /> Profil Pengguna
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={email}
            disabled
            className="opacity-75 cursor-not-allowed"
          />

          <Input
            label="Nama Tampilan"
            type="text"
            placeholder="Contoh: Galang Pradhana"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" type="submit" size="sm" isLoading={isUpdatingProfile}>
            <Save className="h-4 w-4 mr-1.5" /> Simpan Profil
          </Button>
        </div>
      </form>

      {/* SECTION 2: Ganti Password */}
      <form onSubmit={handleChangePassword} className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
          <KeyRound className="h-5 w-5 text-primary" /> Keamanan &amp; Kata Sandi
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Password Baru"
            type="password"
            placeholder="Minimal 8 karakter"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <Input
            label="Konfirmasi Password Baru"
            type="password"
            placeholder="Ulangi password baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="secondary" type="submit" size="sm" isLoading={isChangingPassword}>
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Ubah Password
          </Button>
        </div>
      </form>

      {/* SECTION 3: Tampilan & Preferensi Tema */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
          {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
          Preferensi Tampilan
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-foreground">Mode Tampilan Aplikasi</h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pilih antara Mode Gelap (Dark Mode) atau Mode Terang (Light Mode).
            </p>
          </div>

          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-secondary text-xs font-semibold text-foreground hover:border-primary/50 transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" /> Mode Terang
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-400" /> Mode Gelap
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 4: Logout */}
      <div className="bg-card border border-destructive/30 rounded-2xl p-5 sm:p-6 shadow-sm flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-foreground">Keluar dari Sesi</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Keluar dari akun Anda di perangkat ini.
          </p>
        </div>

        <Button variant="danger" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1.5" /> Logout
        </Button>
      </div>
    </div>
  )
}
