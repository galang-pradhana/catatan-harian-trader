'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  MoreVertical,
  Shield,
  Ban,
  Trash2,
  Crown,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock
} from 'lucide-react'

interface UserItem {
  id: string
  name: string
  email: string
  status: 'active' | 'suspended'
  plan: 'free' | 'premium'
  mt5Connections: number
  registeredAt: string
  lastActiveAt: string
}

const dummyUsers: UserItem[] = [
  {
    id: 'u-1',
    name: 'Galang Pradhana',
    email: 'galang.pradhana@gmail.com',
    status: 'active',
    plan: 'premium',
    mt5Connections: 2,
    registeredAt: '2026-01-15',
    lastActiveAt: '2026-08-03 10:15'
  },
  {
    id: 'u-2',
    name: 'Budi Trader',
    email: 'budi.trader@gmail.com',
    status: 'suspended',
    plan: 'free',
    mt5Connections: 1,
    registeredAt: '2026-03-20',
    lastActiveAt: '2026-08-01 14:22'
  },
  {
    id: 'u-3',
    name: 'Andi FX',
    email: 'andi.fx@yahoo.com',
    status: 'active',
    plan: 'free',
    mt5Connections: 1,
    registeredAt: '2026-05-10',
    lastActiveAt: '2026-08-02 09:11'
  },
  {
    id: 'u-4',
    name: 'Siti Scalper',
    email: 'siti.scalper@outlook.com',
    status: 'active',
    plan: 'premium',
    mt5Connections: 3,
    registeredAt: '2026-06-01',
    lastActiveAt: '2026-08-03 08:45'
  }
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>(dummyUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Action Modals State
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [actionType, setActionType] = useState<'suspend' | 'delete' | 'plan' | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [reauthError, setReauthError] = useState('')

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlan = selectedPlan === 'all' || u.plan === selectedPlan
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus
    return matchesSearch && matchesPlan && matchesStatus
  })

  const handleActionExecute = () => {
    if (!selectedUser || !actionType) return

    if (actionType === 'delete' && !adminPassword) {
      setReauthError('Password admin diperlukan untuk aksi hapus permanen!')
      return
    }

    if (actionType === 'suspend') {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
            : u
        )
      )
    } else if (actionType === 'delete') {
      setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id))
    } else if (actionType === 'plan') {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, plan: u.plan === 'free' ? 'premium' : 'free' }
            : u
        )
      )
    }

    // Reset modal
    setSelectedUser(null)
    setActionType(null)
    setAdminPassword('')
    setReauthError('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Manajemen User</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kelola akun terdaftar, status suspen, dan penetapan plan Freemium secara manual
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama atau email..."
            className="w-full pl-10 pr-4 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Plan Filter */}
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="bg-muted/30 border border-border text-xs text-foreground rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">Semua Plan</option>
            <option value="free">Free Plan</option>
            <option value="premium">Premium Plan</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-muted/30 border border-border text-xs text-foreground rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Plan</th>
                <th className="py-3.5 px-4">MT5 Accounts</th>
                <th className="py-3.5 px-4">Tgl Daftar</th>
                <th className="py-3.5 px-4">Terakhir Aktif</th>
                <th className="py-3.5 px-4 text-right">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4">
                    <Link href={`/admin/users/${user.id}`} className="group">
                      <div className="font-semibold text-foreground group-hover:text-amber-500 transition-colors">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{user.email}</div>
                    </Link>
                  </td>

                  <td className="py-3.5 px-4">
                    {user.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                        <XCircle className="h-3 w-3" /> Suspended
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    {user.plan === 'premium' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Crown className="h-3 w-3" /> Premium
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                        Free Plan
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground font-mono">
                    {user.mt5Connections} Akun
                  </td>

                  <td className="py-3.5 px-4 text-muted-foreground">{user.registeredAt}</td>

                  <td className="py-3.5 px-4 text-muted-foreground">{user.lastActiveAt}</td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setActionType('plan')
                        }}
                        title="Ubah Plan Free/Premium"
                        className="p-1.5 rounded-lg border border-border bg-muted/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                      >
                        <Crown className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setActionType('suspend')
                        }}
                        title={user.status === 'active' ? 'Suspend User' : 'Un-suspend User'}
                        className="p-1.5 rounded-lg border border-border bg-muted/30 text-amber-500 hover:bg-amber-500/10 transition-colors"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedUser(user)
                          setActionType('delete')
                        }}
                        title="Hapus User (Permanen)"
                        className="p-1.5 rounded-lg border border-border bg-muted/30 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl ${
                  actionType === 'delete'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-amber-500/10 text-amber-500'
                }`}
              >
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {actionType === 'suspend' && `Konfirmasi Suspend User`}
                  {actionType === 'delete' && `Konfirmasi Hapus User Permanen`}
                  {actionType === 'plan' && `Konfirmasi Ubah Plan User`}
                </h3>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
            </div>

            {actionType === 'delete' && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 font-semibold">
                  ⚠️ Perhatian: Seluruh koneksi MT5, jurnal, & catatan user ini akan terhapus secara permanen dari database.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Masukkan Password Admin (Re-authentikasi)
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Password admin..."
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500"
                  />
                  {reauthError && (
                    <span className="text-[11px] text-destructive mt-1 block">
                      {reauthError}
                    </span>
                  )}
                </div>
              </div>
            )}

            {actionType === 'suspend' && (
              <p className="text-xs text-muted-foreground">
                Apakah Anda yakin ingin mengganti status suspen user ini? Jika disuspend, sesi login user akan langsung dibatalkan.
              </p>
            )}

            {actionType === 'plan' && (
              <p className="text-xs text-muted-foreground">
                Ubah plan user dari <strong>{selectedUser.plan.toUpperCase()}</strong> ke{' '}
                <strong>{selectedUser.plan === 'free' ? 'PREMIUM' : 'FREE'}</strong>?
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setActionType(null)
                  setAdminPassword('')
                  setReauthError('')
                }}
                className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Batal
              </button>
              <button
                onClick={handleActionExecute}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-black ${
                  actionType === 'delete'
                    ? 'bg-destructive text-white hover:bg-destructive/90'
                    : 'bg-amber-500 hover:bg-amber-600'
                }`}
              >
                Eksekusi Aksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
