'use client'

import React, { useState } from 'react'
import { ShieldAlert, Search, Filter, ShieldCheck, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditLogItem {
  id: string
  adminEmail: string
  action: 'APPROVE_USER' | 'REJECT_USER' | 'suspend_user' | 'delete_user' | 'change_plan' | 'login_admin' | 'update_settings'
  targetUserEmail: string | null
  details: string
  createdAt: string
}

const initialLogs: AuditLogItem[] = [
  {
    id: 'log-approve-1',
    adminEmail: 'owner@chtrader.web.id',
    action: 'APPROVE_USER',
    targetUserEmail: 'rudi.trader@gmail.com',
    details: 'Status diubah dari Pending ke Active (Approved)',
    createdAt: '2026-08-09 10:45:12',
  },
  {
    id: 'log-reject-1',
    adminEmail: 'owner@chtrader.web.id',
    action: 'REJECT_USER',
    targetUserEmail: 'dian.scalper@yahoo.com',
    details: 'Status diubah dari Pending ke Rejected — Alasan: Format nomor HP WhatsApp tidak valid',
    createdAt: '2026-08-09 09:12:05',
  },
  {
    id: 'log-1',
    adminEmail: 'owner@chtrader.web.id',
    action: 'change_plan',
    targetUserEmail: 'galang.pradhana@gmail.com',
    details: 'Plan diubah dari FREE ke PREMIUM',
    createdAt: '2026-08-03 10:18:22',
  },
  {
    id: 'log-2',
    adminEmail: 'owner@chtrader.web.id',
    action: 'suspend_user',
    targetUserEmail: 'budi.trader@gmail.com',
    details: 'User disuspend karena penyalahgunaan token EA',
    createdAt: '2026-08-01 14:30:00',
  },
  {
    id: 'log-3',
    adminEmail: 'owner@chtrader.web.id',
    action: 'login_admin',
    targetUserEmail: null,
    details: 'Login Admin dengan verifikasi 2FA berhasil',
    createdAt: '2026-08-01 09:00:15',
  },
]

export default function AdminAuditLogPage() {
  const [logs] = useState<AuditLogItem[]>(initialLogs)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLogs = logs.filter(
    (l) =>
      l.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.targetUserEmail && l.targetUserEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getActionBadge = (action: AuditLogItem['action']) => {
    switch (action) {
      case 'APPROVE_USER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> APPROVE_USER
          </span>
        )
      case 'REJECT_USER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
            <XCircle className="h-3 w-3" /> REJECT_USER
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {action}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Admin Audit Log</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Catatan immutable (append-only) untuk seluruh aksi persetujuan, suspen, &amp; perubahan sistem
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari email admin, target, atau jenis aksi..."
            className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Operator Admin</th>
                <th className="py-3.5 px-4">Jenis Aksi</th>
                <th className="py-3.5 px-4">Target User</th>
                <th className="py-3.5 px-4">Detail Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                    {log.createdAt}
                  </td>

                  <td className="py-3.5 px-4 font-bold text-foreground font-sans">
                    {log.adminEmail}
                  </td>

                  <td className="py-3.5 px-4">
                    {getActionBadge(log.action)}
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground">
                    {log.targetUserEmail || '-'}
                  </td>

                  <td className="py-3.5 px-4 text-foreground font-sans">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
