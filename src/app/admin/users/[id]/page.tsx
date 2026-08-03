'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Link2,
  ShieldCheck,
  Crown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
  HardDrive
} from 'lucide-react'

export default function AdminUserDetailPage() {
  const params = useParams()
  const userId = params.id as string
  const [activeTab, setActiveTab] = useState<'info' | 'technical'>('info')

  const userDetail = {
    id: userId,
    name: 'Galang Pradhana',
    email: 'galang.pradhana@gmail.com',
    status: 'active',
    plan: 'premium',
    registeredAt: '2026-01-15 08:30',
    lastActiveAt: '2026-08-03 10:15',
    mt5Accounts: [
      {
        id: 'mt5-1',
        accountNumber: '4056802543',
        broker: 'Exness-Real7',
        status: 'active',
        lastSync: '2026-08-03 10:14:22',
        totalTradesSynced: 342,
        lastError: null,
      },
      {
        id: 'mt5-2',
        accountNumber: '10928374',
        broker: 'ICMarkets-Live02',
        status: 'error',
        lastSync: '2026-08-01 16:00:00',
        totalTradesSynced: 88,
        lastError: 'HTTP 401: Unauthorized EA Sync Token',
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/users"
          className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span>{userDetail.name}</span>
            {userDetail.plan === 'premium' && (
              <Crown className="h-4 w-4 text-amber-500 fill-amber-500/20" />
            )}
          </h1>
          <p className="text-xs text-muted-foreground">{userDetail.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-6">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'info'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Info Akun
        </button>
        <button
          onClick={() => setActiveTab('technical')}
          className={`pb-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'technical'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Status Teknis MT5 (Support Tool)
        </button>
      </div>

      {/* Tab 1: Account Info */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-amber-500" />
              <span>Metadata Pengguna</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-foreground">{userDetail.id}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Status Akun</span>
                <span className="font-semibold text-emerald-500 capitalize">
                  {userDetail.status}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Freemium Plan</span>
                <span className="font-bold text-amber-500 uppercase">
                  {userDetail.plan}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-border/40">
                <span className="text-muted-foreground">Tanggal Registrasi</span>
                <span className="text-foreground">{userDetail.registeredAt}</span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Terakhir Aktif</span>
                <span className="text-foreground">{userDetail.lastActiveAt}</span>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-3 shadow-sm">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Kebijakan Privasi (NF-08)</span>
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sesuai standar keamanan & privasi aplikasi, admin panel secara terstruktur{' '}
              <strong>TIDAK memiliki akses</strong> untuk melihat isi jurnal trading,
              catatan psikologi, alasan entry/exit, maupun screenshot yang diunggah oleh user ini.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Technical Status */}
      {activeTab === 'technical' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Link2 className="h-4 w-4 text-amber-500" />
              <span>Daftar Akun MT5 Terhubung ({userDetail.mt5Accounts.length})</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userDetail.mt5Accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-sm text-foreground font-mono">
                        #{acc.accountNumber}
                      </span>
                      <p className="text-xs text-muted-foreground">{acc.broker}</p>
                    </div>

                    {acc.status === 'active' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Active Sync
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                        Sync Error
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs border-t border-border/40 pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Terakhir Sync:</span>
                      <span className="text-foreground">{acc.lastSync}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Trade Sync:</span>
                      <span className="font-semibold text-foreground">
                        {acc.totalTradesSynced} deals
                      </span>
                    </div>
                  </div>

                  {acc.lastError && (
                    <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-mono space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Error Log:
                      </div>
                      <p>{acc.lastError}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
