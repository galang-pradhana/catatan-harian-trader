'use client'

import React from 'react'
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
  Server
} from 'lucide-react'

export default function AdminDashboardPage() {
  const metrics = {
    totalUsers: 142,
    activeUsers7d: 89,
    activeUsers30d: 118,
    newSignupsThisWeek: 18,
    totalMt5Connections: 95,
    errorMt5Connections: 3,
    totalSyncedTrades: 14520,
    freeUsers: 130,
    premiumUsers: 12,
  }

  return (
    <div className="space-y-8">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Monitoring Kesehatan Sistem</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Metrik operasional aplikasi & kesiapan skala user (Target 1,000 User)
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors w-fit"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Metrik</span>
        </button>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              ({Math.round((metrics.activeUsers7d / metrics.totalUsers) * 100)}% dari total)
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

      {/* System Operational Status & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Health Monitoring */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="h-4 w-4 text-amber-500" />
              <span>Status Infrastruktur & Database</span>
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
