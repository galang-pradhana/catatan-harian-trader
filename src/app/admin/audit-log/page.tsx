'use client'

import React, { useState } from 'react'
import { ShieldAlert, Search, Filter, ShieldCheck, Clock } from 'lucide-react'

interface AuditLogItem {
  id: string
  adminEmail: string
  action: 'suspend_user' | 'delete_user' | 'change_plan' | 'login_admin'
  targetUserEmail: string | null
  details: string
  createdAt: string
}

const dummyLogs: AuditLogItem[] = [
  {
    id: 'log-1',
    adminEmail: 'owner@chtrader.web.id',
    action: 'change_plan',
    targetUserEmail: 'galang.pradhana@gmail.com',
    details: 'Plan diubah dari FREE ke PREMIUM',
    createdAt: '2026-08-03 10:18:22'
  },
  {
    id: 'log-2',
    adminEmail: 'owner@chtrader.web.id',
    action: 'suspend_user',
    targetUserEmail: 'budi.trader@gmail.com',
    details: 'User disuspend karena penyalahgunaan token EA',
    createdAt: '2026-08-01 14:30:00'
  },
  {
    id: 'log-3',
    adminEmail: 'owner@chtrader.web.id',
    action: 'login_admin',
    targetUserEmail: null,
    details: 'Login Admin dengan verifikasi 2FA berhasil',
    createdAt: '2026-08-01 09:00:15'
  }
]

export default function AdminAuditLogPage() {
  const [logs] = useState<AuditLogItem[]>(dummyLogs)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredLogs = logs.filter(
    (l) =>
      l.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.targetUserEmail && l.targetUserEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.details.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Admin Audit Log</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Catatan immutable (append-only) untuk seluruh aksi operator & perubahan status di sistem
        </p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl">
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
            <tbody className="divide-y divide-border/60">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                    {log.createdAt}
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-foreground">
                    {log.adminEmail}
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      {log.action}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground">
                    {log.targetUserEmail || '-'}
                  </td>

                  <td className="py-3.5 px-4 text-foreground">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
