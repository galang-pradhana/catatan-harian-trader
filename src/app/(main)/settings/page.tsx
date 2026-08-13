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
  ShieldCheck,
  Globe,
  Crown,
  Server,
  Sliders,
  Hash,
  Smartphone,
  AlertTriangle,
  Bell,
  Download,
  FileCheck,
  Info,
  ShieldAlert,
  ExternalLink,
  Lock,
} from 'lucide-react'
import { useThemeStore } from '@/store/theme-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/toast'
import { Modal } from '@/components/shared/modal'
import { createClient } from '@/services/supabase/client'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const { theme, toggleTheme } = useThemeStore()

  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'security' | 'notifications' | 'backup'>('account')

  // Account Tab States
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [membershipTier, setMembershipTier] = useState('free')
  const [connSummary, setConnSummary] = useState({ used: 0, max: 3, mt5Count: 0, manualCount: 0, executionEnabledCount: 0 })

  // Preferences Tab States
  const [defaultPeriod, setDefaultPeriod] = useState('month')
  const [numberFormat, setNumberFormat] = useState('en')

  // Security Tab States
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])

  // Danger Zone States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)

  // Notification Tab States
  const [notifPrefs, setNotifPrefs] = useState({
    channel_email: true,
    channel_push: false,
    channel_telegram: false,
    alert_sync_error: true,
    alert_order_execution: true,
    alert_compounding_goal: true,
    alert_journal_reminder: true,
    alert_ai_analysis_done: true,
  })

  // Backup Tab States
  const [exportHistory, setExportHistory] = useState<any[]>([])
  const [isExporting, setIsExporting] = useState(false)

  // General Loading States
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSupabaseConfigured, setIsSupabaseConfigured] = useState(false)

  // Detect local timezone
  useEffect(() => {
    try {
      const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (localTz) setTimezone(localTz)
    } catch {}
  }, [])

  // Fetch Settings Data
  useEffect(() => {
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    setIsSupabaseConfigured(Boolean(isConfigured))

    async function loadData() {
      try {
        setIsLoading(true)
        const [settRes, notifRes, sessRes, expRes] = await Promise.all([
          fetch('/api/user/settings'),
          fetch('/api/user/notifications'),
          fetch('/api/user/sessions'),
          fetch('/api/user/export'),
        ])

        if (settRes.ok) {
          const data = await settRes.json()
          if (data.user) {
            setEmail(data.user.email || '')
            setDisplayName(data.user.displayName || '')
            if (data.user.timezone) setTimezone(data.user.timezone)
            if (data.user.dashboardDefaultPeriod) setDefaultPeriod(data.user.dashboardDefaultPeriod)
            if (data.user.numberFormat) setNumberFormat(data.user.numberFormat)
            setTwoFactorEnabled(Boolean(data.user.twoFactorEnabled))
            setMembershipTier(data.user.membershipTier || 'free')
          }
          if (data.connectionsSummary) {
            setConnSummary(data.connectionsSummary)
          }
        }

        if (notifRes.ok) {
          const data = await notifRes.json()
          if (data.preferences) setNotifPrefs(data.preferences)
        }

        if (sessRes.ok) {
          const data = await sessRes.json()
          if (data.sessions) setSessions(data.sessions)
        }

        if (expRes.ok) {
          const data = await expRes.json()
          if (data.history) setExportHistory(data.history)
        }
      } catch (err) {
        console.warn('Load settings warning:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Save Settings Handler
  const handleSaveSettings = async (updates: Record<string, any>) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        toast('Pengaturan berhasil diperbarui', 'success')
      } else {
        toast('Gagal menyimpan ke server', 'error')
      }
    } catch {
      toast('Gagal memproses penyimpanan', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Update Notification Preferences Handler
  const handleSaveNotifPrefs = async (newPrefs: typeof notifPrefs) => {
    setNotifPrefs(newPrefs)
    try {
      const res = await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      })
      if (res.ok) {
        toast('Preferensi notifikasi disimpan', 'success')
      }
    } catch {
      toast('Gagal mengupdate preferensi notifikasi', 'error')
    }
  }

  // Change Password Handler
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

    setIsSaving(true)
    if (isSupabaseConfigured) {
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
        toast('Password berhasil diubah!', 'success')
        setNewPassword('')
        setConfirmPassword('')
      } catch (err: any) {
        toast(err.message || 'Gagal mengubah password', 'error')
      } finally {
        setIsSaving(false)
      }
    } else {
      setTimeout(() => {
        setIsSaving(false)
        toast('Password berhasil diubah (Demo Mode)', 'success')
        setNewPassword('')
        setConfirmPassword('')
      }, 500)
    }
  }

  // Logout Handler
  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    toast('Anda telah logout', 'info')
    router.push('/login')
  }

  // Export Data Handler
  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const res = await fetch('/api/user/export', { method: 'POST' })
      if (!res.ok) throw new Error('Gagal mengekspor data')
      const data = await res.json()
      
      // Trigger browser download JSON file
      const jsonStr = JSON.stringify(data.exportData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.fileName || 'export_catatan_trader.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast('Export data berhasil didownload!', 'success')
      
      // Refresh export history
      const histRes = await fetch('/api/user/export')
      if (histRes.ok) {
        const histData = await histRes.json()
        setExportHistory(histData.history || [])
      }
    } catch (err: any) {
      toast(err.message || 'Gagal mengekspor data', 'error')
    } finally {
      setIsExporting(false)
    }
  }

  // Account Deletion Handler
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast('Masukkan password Anda untuk konfirmasi', 'error')
      return
    }

    setIsDeletingAccount(true)
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus akun')

      toast('Akun Anda berhasil dihapus', 'success')
      router.push('/register')
    } catch (err: any) {
      toast(err.message || 'Gagal menghapus akun', 'error')
    } finally {
      setIsDeletingAccount(false)
      setIsDeleteModalOpen(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header & Sub-tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pengaturan</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Kelola profil pengguna, preferensi tampilan, keamanan, notifikasi, dan cadangan data Anda.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-sm overflow-x-auto">
          {[
            { id: 'account',       label: 'Akun' },
            { id: 'preferences',   label: 'Preferensi' },
            { id: 'security',      label: 'Keamanan' },
            { id: 'notifications', label: 'Notifikasi' },
            { id: 'backup',        label: 'Backup' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: AKUN */}
      {activeTab === 'account' && (
        <div className="space-y-6">
          {/* Section: Profil Pengguna */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <User className="h-5 w-5 text-primary" /> Profil Pengguna
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email Akun"
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
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSaveSettings({ displayName })}
                isLoading={isSaving}
              >
                <Save className="h-4 w-4 mr-1.5" /> Simpan Profil
              </Button>
            </div>
          </div>

          {/* Section: Status Plan / Keanggotaan */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Crown className="h-5 w-5 text-amber-400" /> Status Plan &amp; Keanggotaan
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-secondary/40 border border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  {membershipTier === 'premium' ? 'PRO' : 'FREE'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground capitalize">
                      Plan {membershipTier}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                      Aktif
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {membershipTier === 'premium'
                      ? 'Akses penuh ke semua fitur analitik, AI Assistant, & unlimited connection.'
                      : 'Batas 3 koneksi trading (MT4/MT5/Manual) & fitur standar.'}
                  </p>
                </div>
              </div>

              {membershipTier === 'free' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toast('Hubungi Admin untuk upgrade ke Premium', 'info')}
                >
                  <Crown className="h-4 w-4 mr-1.5 text-amber-400" /> Upgrade ke Premium
                </Button>
              )}
            </div>
          </div>

          {/* Section: Zona Waktu */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Globe className="h-5 w-5 text-primary" /> Zona Waktu
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Pilih Zona Waktu Utama</label>
              <select
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value)
                  handleSaveSettings({ timezone: e.target.value })
                }}
                className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all cursor-pointer"
              >
                <option value="Asia/Jakarta">Asia/Jakarta (WIB) — UTC+07:00</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA) — UTC+08:00</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT) — UTC+09:00</option>
                <option value="UTC">UTC (Universal Coordinated Time) — UTC+00:00</option>
                <option value="America/New_York">America/New York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
              </select>
              <p className="text-[11px] text-muted-foreground">
                Zona waktu ini digunakan untuk menampilkan tanggal/jam transaksi trade, Kalender, Pengingat, dan Grafik Statistik.
              </p>
            </div>
          </div>

          {/* Section: Ringkasan Koneksi Akun Trading */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Server className="h-5 w-5 text-primary" /> Ringkasan Koneksi Trading
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-foreground">
                  {connSummary.used} dari {connSummary.max} Kuota Koneksi Terpakai
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Terdiri dari {connSummary.mt5Count} akun MT4/MT5 dan {connSummary.manualCount} akun Manual.
                </p>
              </div>

              <Button variant="outline" size="sm" onClick={() => router.push('/mt5')}>
                Kelola Koneksi Trading <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PREFERENSI */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          {/* Mode Tampilan Tema */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              Mode Tampilan Aplikasi
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">Tema Warna UI</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pilih antara Mode Gelap (Dark Mode) atau Mode Terang (Light Mode).
                </p>
              </div>

              <button
                onClick={() => {
                  toggleTheme()
                  handleSaveSettings({ theme: theme === 'dark' ? 'light' : 'dark' })
                }}
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

          {/* Periode Default Dashboard */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Sliders className="h-5 w-5 text-primary" /> Periode Default Dashboard
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Rentang Waktu Default Saat Membuka Dashboard</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'week', label: 'Minggu Ini (This Week)' },
                  { value: 'month', label: 'Bulan Ini (This Month)' },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      setDefaultPeriod(item.value)
                      handleSaveSettings({ dashboardDefaultPeriod: item.value })
                    }}
                    className={cn(
                      'p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer text-left',
                      defaultPeriod === item.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Konfigurasi Pip per Simbol */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Hash className="h-5 w-5 text-primary" /> Konfigurasi Pip per Simbol
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-foreground">Kelola Pip Size &amp; Point Custom</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Atur pengali pip per instrumen (contoh: Gold XAUUSD = 0.1, Forex = 0.0001, Crypto = 1.0).
                </p>
              </div>

              <Button variant="secondary" size="sm" onClick={() => router.push('/statistics')}>
                Kelola Pip Size (V7) <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </div>
          </div>

          {/* Format Tampilan Angka */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Hash className="h-5 w-5 text-primary" /> Format Tampilan Angka
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Pilih Format Pemisah Ribuan &amp; Desimal</label>
              <select
                value={numberFormat}
                onChange={(e) => {
                  setNumberFormat(e.target.value)
                  handleSaveSettings({ numberFormat: e.target.value })
                }}
                className="w-full bg-secondary border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all cursor-pointer"
              >
                <option value="en">Format Standar (1,000.00) — Koma untuk ribuan, titik untuk desimal</option>
                <option value="id">Format Indonesia (1.000,00) — Titik untuk ribuan, koma untuk desimal</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KEAMANAN */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Ganti Password */}
          <form onSubmit={handleChangePassword} className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <KeyRound className="h-5 w-5 text-primary" /> Ganti Kata Sandi (Password)
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
              <Button variant="primary" type="submit" size="sm" isLoading={isSaving}>
                <ShieldCheck className="h-4 w-4 mr-1.5" /> Ubah Password
              </Button>
            </div>
          </form>

          {/* Autentikasi 2FA */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Lock className="h-5 w-5 text-primary" /> Autentikasi Dua Faktor (2FA)
            </div>

            {connSummary.executionEnabledCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start gap-3 text-xs text-amber-500">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Rekomendasi Keamanan Tinggi:</strong> Akun Anda memiliki {connSummary.executionEnabledCount} koneksi dengan fitur Quick Entry / Executable aktif. Sangat disarankan mengaktifkan 2FA untuk melindungi modal trading Anda.
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-foreground">Status 2FA (Email OTP)</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Minta kode OTP via email setiap kali login dari perangkat baru.
                </p>
              </div>

              <button
                onClick={() => {
                  const nextVal = !twoFactorEnabled
                  setTwoFactorEnabled(nextVal)
                  handleSaveSettings({ twoFactorEnabled: nextVal })
                }}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer',
                  twoFactorEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-secondary text-muted-foreground border-border'
                )}
              >
                {twoFactorEnabled ? '2FA Aktif' : 'Aktifkan 2FA'}
              </button>
            </div>
          </div>

          {/* Sesi Aktif */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Smartphone className="h-5 w-5 text-primary" /> Sesi Aktif &amp; Perangkat
            </div>

            <div className="space-y-3">
              {sessions.map((sess) => (
                <div key={sess.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border text-xs">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-semibold text-foreground">{sess.device_info}</div>
                      <div className="text-[10px] text-muted-foreground">IP: {sess.ip_address || '127.0.0.1'}</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    Sesi Ini
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Keluar dari Sesi */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-foreground">Keluar dari Perangkat Ini</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Keluar dari sesi akun Anda di perangkat ini.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1.5" /> Logout
            </Button>
          </div>

          {/* Zona Bahaya (Danger Zone) */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-base font-bold text-destructive">
              <ShieldAlert className="h-5 w-5" /> Zona Bahaya (Danger Zone)
            </div>

            <p className="text-xs text-muted-foreground">
              Tindakan ini akan menghapus akun dan seluruh catatan transaksi, jurnal, catatan, dan riwayat modal Anda secara permanen dari server.
            </p>

            <div className="pt-2">
              <Button variant="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
                <AlertTriangle className="h-4 w-4 mr-1.5" /> Hapus Akun Permanen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFIKASI */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex items-start gap-3 text-xs text-blue-400">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>Informasi Preferensi Notifikasi:</strong> Pilihan saluran dan alert di bawah ini tersimpan otomatis di database. Pengiriman aktual notifikasi Push Browser/App saat ini sedang disiapkan untuk rilis addendum berikutnya.
            </span>
          </div>

          {/* Kanal Notifikasi */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Bell className="h-5 w-5 text-primary" /> Kanal Pengiriman Notifikasi
            </div>

            <div className="space-y-3">
              {[
                { key: 'channel_email', label: 'Email Notification', desc: 'Kirim notifikasi ke email utama akun Anda' },
                { key: 'channel_push', label: 'Push Notification (Browser/App)', desc: 'Notifikasi langsung di perangkat (Pending Infra)' },
                { key: 'channel_telegram', label: 'Telegram Bot Alert (V6)', desc: 'Kirim alert langsung ke grup/chat Telegram Anda' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean((notifPrefs as any)[item.key])}
                    onChange={(e) =>
                      handleSaveNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked })
                    }
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Jenis Alert */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Sliders className="h-5 w-5 text-primary" /> Jenis Peringatan (Alerts)
            </div>

            <div className="space-y-3">
              {[
                { key: 'alert_sync_error', label: 'Sync & Koneksi Terputus', desc: 'Notifikasi jika EA MT4/MT5 mengalami koneksi terputus' },
                { key: 'alert_order_execution', label: 'Eksekusi Order Trading', desc: 'Notifikasi jika Quick Entry berhasil / gagal dieksekusi' },
                { key: 'alert_compounding_goal', label: 'Pencapaian Level Compounding', desc: 'Notifikasi saat target level compounding baru tercapai' },
                { key: 'alert_journal_reminder', label: 'Pengingat Isi Jurnal Harian', desc: 'Notifikasi harian untuk melengkapi jurnal kualitatif' },
                { key: 'alert_ai_analysis_done', label: 'Hasil Analisa AI Selesai', desc: 'Notifikasi saat analisa AI mendalam selesai diproses' },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean((notifPrefs as any)[item.key])}
                    onChange={(e) =>
                      handleSaveNotifPrefs({ ...notifPrefs, [item.key]: e.target.checked })
                    }
                    className="h-4 w-4 accent-primary rounded cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BACKUP */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Tombol Export Data */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <Download className="h-5 w-5 text-primary" /> Cadangan &amp; Ekspor Data
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-foreground">Unduh Seluruh Data Saya</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Dapatkan file salinan lengkap transaksi trade, jurnal kualitatif, catatan, strategi, dan rencana compounding dalam format JSON.
                </p>
              </div>

              <Button variant="primary" size="sm" onClick={handleExportData} isLoading={isExporting}>
                <Download className="h-4 w-4 mr-1.5" /> Export Semua Data
              </Button>
            </div>
          </div>

          {/* Info Cakupan Export */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <FileCheck className="h-4 w-4 text-emerald-400" /> Informasi Cakupan File Ekspor
            </div>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Termasuk: Seluruh closed trades, posisi terbuka, pnl, pips, dan komisi.</li>
              <li>Termasuk: Jurnal kualitatif (psikologi, alasan entry, mistake tags, rating disiplin).</li>
              <li>Termasuk: Daftar strategi trading, target compounding plan, dan log evaluasi harian.</li>
              <li>Tidak Termasuk: Screenshot gambar chart resolusi tinggi (dapat diunduh manual dari halaman detail trade).</li>
            </ul>
          </div>

          {/* Riwayat Export */}
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-3">
              <FileCheck className="h-5 w-5 text-primary" /> Riwayat Ekspor
            </div>

            {exportHistory.length > 0 ? (
              <div className="space-y-2">
                {exportHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border text-xs">
                    <div>
                      <div className="font-semibold text-foreground">{item.file_name || 'export_catatan_trader.json'}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(item.requested_at).toLocaleString('id-ID')}
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                      Selesai
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada riwayat ekspor data sebelumnya.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal Hapus Akun (Danger Zone) */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus Akun Permanen"
      >
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/30 p-3.5 rounded-xl flex items-start gap-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              <strong>PERINGATAN:</strong> Tindakan ini tidak dapat dibatalkan. Seluruh data transaksi trade, jurnal, dan riwayat modal Anda akan dihapus permanen.
            </span>
          </div>

          <Input
            label="Masukkan Password Anda untuk Konfirmasi"
            type="password"
            placeholder="Password saat ini"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteAccount} isLoading={isDeletingAccount}>
              Ya, Hapus Akun Saya
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
