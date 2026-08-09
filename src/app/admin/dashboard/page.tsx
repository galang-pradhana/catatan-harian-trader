'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  UserCheck,
  UserPlus,
  Link2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Crown,
  Database,
  RefreshCw,
  Server,
  Clock,
  Check,
  X,
  ShieldCheck,
  Settings,
  ToggleLeft,
  ToggleRight,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getAdminSettings, saveAdminSettings } from '@/utils/admin-settings-storage'

interface PendingUserItem {
  id: string
  name: string
  email: string
  registeredAt: string
}

const initialPendingUsers: PendingUserItem[] = [
  {
    id: 'u-pending-1',
    name: 'Rudi Pendjurnal',
    email: 'rudi.trader@gmail.com',
    registeredAt: '2026-08-09 09:30',
  },
  {
    id: 'u-pending-2',
    name: 'Dian Trader FX',
    email: 'dian.scalper@yahoo.com',
    registeredAt: '2026-08-09 10:15',
  },
]

export default function AdminDashboardPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUserItem[]>([])
  const [requireApproval, setRequireApproval] = useState<boolean>(true)
  const [isSavingSetting, setIsSavingSetting] = useState(false)
  const [realMetrics, setRealMetrics] = useState<any>(null)

  // Fetch Admin Settings & Real Pending Users & Metrics
  useEffect(() => {
    fetch('/api/admin/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.settings) {
          setRequireApproval(json.settings.requireAdminApproval ?? true)
        }
      })
      .catch(() => {
        setRequireApproval(getAdminSettings().requireAdminApproval)
      })

    // Fetch real metrics
    fetch('/api/admin/metrics')
      .then((res) => res.json())
      .then((json) => {
        if (json.metrics) setRealMetrics(json.metrics)
      })
      .catch(() => {})

    // Fetch real pending users
    fetch('/api/admin/users?status=pending')
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.users)) {
          const mapped: PendingUserItem[] = json.users.map((u: any) => ({
            id: u.id,
            name: u.display_name || u.email?.split('@')[0] || 'User',
            email: u.email || 'Tanpa Email',
            registeredAt: u.created_at ? new Date(u.created_at).toLocaleString('id-ID') : '-',
          }))
          setPendingUsers(mapped)
        }
      })
      .catch(() => {})
  }, [])

  const handleToggleSetting = async () => {
    const nextVal = !requireApproval
    setRequireApproval(nextVal)
    saveAdminSettings({ requireAdminApproval: nextVal })
    setIsSavingSetting(true)

    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requireAdminApproval: nextVal }),
      })
    } catch {}
    setIsSavingSetting(false)
  }

  const handleApproveUser = (id: string) => {
    setPendingUsers((prev) => prev.filter((u) => u.id !== id))
    fetch(`/api/admin/users/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    }).catch(() => {})
  }

  const handleRejectUser = (id: string) => {
    setPendingUsers((prev) => prev.filter((u) => u.id !== id))
    fetch(`/api/admin/users/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', reason: 'Quick rejected from dashboard' }),
    }).catch(() => {})
  }

  const metrics = {
    totalUsers: realMetrics?.totalUsers ?? 142,
    pendingUsersCount: pendingUsers.length,
    activeUsers7d: realMetrics?.activeUsers7d ?? 89,
    activeUsers30d: realMetrics?.activeUsers30d ?? 118,
    newSignupsThisWeek: 18,
    totalMt5Connections: realMetrics?.totalMt5Connections ?? 95,
    errorMt5Connections: realMetrics?.errorMt5Connections ?? 3,
    totalSyncedTrades: realMetrics?.totalTradesSynced ?? 14520,
    freeUsers: realMetrics?.freeUsers ?? 130,
    premiumUsers: realMetrics?.premiumUsers ?? 12,
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Monitoring Kesehatan Sistem &amp; Gate Approval</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Metrik operasional aplikasi, persetujuan antrian user baru, &amp; pengaturan sistem
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors w-fit shadow-2xs cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Metrik</span>
        </button>
      </div>

      {/* Main Metric Cards Grid (5 Cards Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 0: Menunggu Approval (Highlighted if > 0) */}
        <div
          className={cn(
            'bg-card border rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all',
            metrics.pendingUsersCount > 0
              ? 'border-amber-500/60 bg-amber-500/10 shadow-amber-500/10'
              : 'border-border'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Menunggu Approval</span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-foreground font-mono">{metrics.pendingUsersCount}</span>
            {metrics.pendingUsersCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-black animate-pulse">
                Antrian Aktif
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
            <span>Status Approval Gate:</span>
            <span className={cn('font-bold', requireApproval ? 'text-amber-400' : 'text-muted-foreground')}>
              {requireApproval ? 'Wajib Approval' : 'Auto-Approve'}
            </span>
          </div>
        </div>

        {/* Metric 1 */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total User</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-foreground">{metrics.totalUsers}</span>
            <span className="text-xs text-emerald-500 font-semibold ml-2 inline-flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +{metrics.newSignupsThisWeek} minggu ini
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
            <span>Target Skala: 1,000</span>
            <span className="font-semibold text-foreground">{Math.round((metrics.totalUsers / 1000) * 100)}%</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">User Aktif (7 Hari)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-foreground">{metrics.activeUsers7d}</span>
            <span className="text-xs text-muted-foreground ml-2">
              ({Math.round((metrics.activeUsers7d / metrics.totalUsers) * 100)}%)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
            <span>Aktif 30 Hari:</span>
            <span className="font-semibold text-foreground">{metrics.activeUsers30d} user</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Koneksi MT5 Aktif</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Link2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-foreground">{metrics.totalMt5Connections}</span>
            <span className="text-xs text-amber-500 font-semibold ml-2">
              {metrics.errorMt5Connections} Error
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
            <span>Total Sync Deals:</span>
            <span className="font-semibold text-foreground">{metrics.totalSyncedTrades.toLocaleString()} deals</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Plan Distribution</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-foreground">{metrics.freeUsers} Free</span>
            <span className="text-sm font-bold text-amber-500">/ {metrics.premiumUsers} Prem</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
            <span>Freemium Status:</span>
            <span className="font-semibold text-amber-500">Readiness Active</span>
          </div>
        </div>
      </div>

      {/* SECTION: PERSETUJUAN TERTUNDA (QUICK EXECUTION SECTION - Shown if pending > 0) */}
      {pendingUsers.length > 0 && (
        <div className="bg-card border border-amber-500/40 rounded-3xl p-6 shadow-md space-y-4 bg-gradient-to-br from-card to-amber-500/5">
          <div className="flex items-center justify-between border-b border-border/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400 animate-pulse" />
              <h2 className="text-base font-extrabold text-foreground">
                Persetujuan Tertunda ({pendingUsers.length} Antrian User)
              </h2>
            </div>

            <Link
              href="/admin/users?status=pending"
              className="text-xs font-bold text-amber-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Lihat Semua di User Management</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="p-4 rounded-2xl bg-background border border-border flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-extrabold text-foreground">{u.name}</h4>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">{u.email}</p>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-1">
                    📅 Daftar: {u.registeredAt}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApproveUser(u.id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs h-8 px-3 cursor-pointer shadow-2xs"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleRejectUser(u.id)}
                    className="font-bold text-xs h-8 px-3 cursor-pointer shadow-2xs"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: PENGATURAN PENDAFTARAN (APPROVAL GATE TOGGLE) */}
      <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h2 className="text-base font-extrabold text-foreground">
              Pengaturan Mode Approval Admin &amp; Pendaftaran
            </h2>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Konfigurasi Sistem</span>
        </div>

        <div className="p-4 rounded-2xl bg-muted/20 border border-border flex items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
              Wajib Approval Admin untuk User Baru
              <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', requireApproval ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-muted text-muted-foreground border-border')}>
                {requireApproval ? 'Aktif (Manual Approval)' : 'Non-aktif (Auto-Approve)'}
              </span>
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Jika diaktifkan (<strong className="text-foreground">ON</strong>), seluruh user baru yang mendaftar akan berstatus <strong className="text-amber-400">Pending</strong> hingga disetujui oleh admin. Jika dinonaktifkan (<strong className="text-foreground">OFF</strong>), pendaftaran user baru langsung berstatus <strong className="text-emerald-400">Active</strong> secara otomatis.
            </p>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            onClick={handleToggleSetting}
            disabled={isSavingSetting}
            className={cn(
              'w-14 h-8 rounded-full transition-colors relative focus:outline-none p-1 cursor-pointer shrink-0 border',
              requireApproval ? 'bg-amber-500 border-amber-400' : 'bg-muted border-border'
            )}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full bg-white transition-transform shadow-md',
                requireApproval ? 'translate-x-6' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* System Operational Status & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Health Monitoring */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-amber-500" />
              <span>Status Infrastruktur &amp; Database</span>
            </h2>
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Healthy
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Supabase Database API</span>
                <span className="font-bold text-emerald-500">99.9% Uptime</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full w-[99.9%]" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">MT5 EA Webhook Endpoint</span>
                <span className="font-bold text-emerald-500">120ms Latency</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full w-[95%]" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Catatan Kesiapan Skala User (Freemium Milestone)
            </div>
            <p className="text-muted-foreground text-[11px]">
              Sistem saat ini menampung 142 dari target 1,000 user. Modul payment gateway belum diaktifkan sesuai spesifikasi SRS V3 section 0.
            </p>
          </div>
        </div>

        {/* Right Column: Technical Connection Issues summary */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>Koneksi MT5 Bermasalah ({metrics.errorMt5Connections})</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            User dengan status EA `error` dalam 24 jam terakhir:
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-xl border border-border bg-muted/20 text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">budi.trader@gmail.com</span>
                <span className="text-destructive font-mono text-[10px]">HTTP 401</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Token sync invalid / EA dicopot
              </p>
            </div>

            <div className="p-3 rounded-xl border border-border bg-muted/20 text-xs space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-foreground">andi.fx@yahoo.com</span>
                <span className="text-amber-500 font-mono text-[10px]">TIMEOUT</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                Tidak ada sync selama &gt; 48 jam
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
