'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  Shield,
  Ban,
  Trash2,
  Crown,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Check,
  X,
  Loader2,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface UserItem {
  id: string
  name: string
  email: string
  status: 'active' | 'pending' | 'suspended' | 'rejected'
  plan: 'free' | 'premium'
  mt5Connections: number
  registeredAt: string
  lastActiveAt: string
}

const initialUsers: UserItem[] = [
  {
    id: 'u-1',
    name: 'Galang Pradhana',
    email: 'galang.pradhana@gmail.com',
    status: 'active',
    plan: 'premium',
    mt5Connections: 2,
    registeredAt: '2026-01-15',
    lastActiveAt: '2026-08-03 10:15',
  },
  {
    id: 'u-pending-1',
    name: 'Rudi Pendjurnal',
    email: 'rudi.trader@gmail.com',
    status: 'pending',
    plan: 'free',
    mt5Connections: 0,
    registeredAt: '2026-08-09',
    lastActiveAt: 'Belum Aktif',
  },
  {
    id: 'u-2',
    name: 'Budi Trader',
    email: 'budi.trader@gmail.com',
    status: 'suspended',
    plan: 'free',
    mt5Connections: 1,
    registeredAt: '2026-03-20',
    lastActiveAt: '2026-08-01 14:22',
  },
  {
    id: 'u-3',
    name: 'Andi FX',
    email: 'andi.fx@yahoo.com',
    status: 'active',
    plan: 'free',
    mt5Connections: 1,
    registeredAt: '2026-05-10',
    lastActiveAt: '2026-08-02 09:11',
  },
  {
    id: 'u-4',
    name: 'Siti Scalper',
    email: 'siti.scalper@outlook.com',
    status: 'active',
    plan: 'premium',
    mt5Connections: 3,
    registeredAt: '2026-06-01',
    lastActiveAt: '2026-08-03 08:45',
  },
]

function AdminUsersContent() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [users, setUsers] = useState<UserItem[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>(statusParam || 'all')

  useEffect(() => {
    if (statusParam) {
      setSelectedStatus(statusParam)
    }
  }, [statusParam])

  // Single Action Modal States
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'suspend' | 'delete' | 'plan' | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [reauthError, setReauthError] = useState('')

  // Bulk Selection States
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlan = selectedPlan === 'all' || u.plan === selectedPlan
      const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus
      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [users, searchTerm, selectedPlan, selectedStatus])

  // Bulk Select Toggle Handlers
  const isAllSelected = filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id))
    }
  }

  const handleToggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((item) => item !== id))
    } else {
      setSelectedUserIds([...selectedUserIds, id])
    }
  }

  // Execute Single Actions
  const handleActionExecute = async () => {
    if (!selectedUser || !actionType) return

    if (actionType === 'delete' && !adminPassword) {
      setReauthError('Password admin diperlukan untuk aksi hapus permanen!')
      return
    }

    try {
      if (actionType === 'approve') {
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, status: 'active' } : u))
        )
        // Call API endpoint
        fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        }).catch(() => {})
      } else if (actionType === 'reject') {
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, status: 'rejected' } : u))
        )
        fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', reason: rejectReason }),
        }).catch(() => {})
      } else if (actionType === 'suspend') {
        const nextStatus = selectedUser.status === 'active' ? 'suspended' : 'active'
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, status: nextStatus } : u))
        )
        fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'suspend', newStatus: nextStatus }),
        }).catch(() => {})
      } else if (actionType === 'delete') {
        setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id))
        fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', adminPassword }),
        }).catch(() => {})
      } else if (actionType === 'plan') {
        const nextPlan = selectedUser.plan === 'free' ? 'premium' : 'free'
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? { ...u, plan: nextPlan } : u))
        )
        fetch(`/api/admin/users/${selectedUser.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'change_plan', newPlan: nextPlan }),
        }).catch(() => {})
      }
    } finally {
      setSelectedUser(null)
      setActionType(null)
      setRejectReason('')
      setAdminPassword('')
      setReauthError('')
    }
  }

  // Execute Bulk Actions
  const handleBulkApprove = () => {
    setUsers((prev) =>
      prev.map((u) => (selectedUserIds.includes(u.id) ? { ...u, status: 'active' } : u))
    )
    fetch('/api/admin/users/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_bulk', userIds: selectedUserIds }),
    }).catch(() => {})
    setSelectedUserIds([])
  }

  const handleBulkReject = () => {
    setUsers((prev) =>
      prev.map((u) => (selectedUserIds.includes(u.id) ? { ...u, status: 'rejected' } : u))
    )
    fetch('/api/admin/users/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject_bulk', userIds: selectedUserIds, reason: 'Bulk rejected by admin' }),
    }).catch(() => {})
    setSelectedUserIds([])
  }

  return (
    <div className="space-y-6 relative pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-foreground">Manajemen User &amp; Persetujuan</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Kelola persetujuan pendaftaran user baru, status suspen, dan penetapan plan manual
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-xs">
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
            className="bg-muted/30 border border-border text-xs text-foreground font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">Semua Plan</option>
            <option value="free">Free Plan</option>
            <option value="premium">Premium Plan</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-muted/30 border border-border text-xs text-foreground font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending (Menunggu Approval)</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected (Ditolak)</option>
          </select>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                  />
                </th>
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
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isChecked = selectedUserIds.includes(user.id)

                  return (
                    <tr key={user.id} className={cn('hover:bg-muted/20 transition-colors', isChecked && 'bg-primary/5')}>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectUser(user.id)}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4">
                        <Link href={`/admin/users/${user.id}`} className="group">
                          <div className="font-bold text-foreground group-hover:text-amber-400 transition-colors">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{user.email}</div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4">
                        {user.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" /> Active
                          </span>
                        )}
                        {user.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse">
                            <Clock className="h-3 w-3" /> Pending Approval
                          </span>
                        )}
                        {user.status === 'suspended' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/30">
                            <XCircle className="h-3 w-3" /> Suspended
                          </span>
                        )}
                        {user.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                            <XCircle className="h-3 w-3" /> Rejected
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

                      <td className="py-3.5 px-4 text-muted-foreground font-mono font-semibold">
                        {user.mt5Connections} Akun
                      </td>

                      <td className="py-3.5 px-4 text-muted-foreground font-mono">{user.registeredAt}</td>

                      <td className="py-3.5 px-4 text-muted-foreground font-mono">{user.lastActiveAt}</td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Pending Approval Specific Buttons */}
                          {user.status === 'pending' ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setActionType('approve')
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Setujui Akun User Ini"
                              >
                                <Check className="h-3.5 w-3.5" /> Approve
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedUser(user)
                                  setActionType('reject')
                                }}
                                className="px-2.5 py-1 rounded-lg bg-destructive/15 hover:bg-destructive/25 text-destructive border border-destructive/30 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Tolak Pendaftaran User"
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada user ditemukan sesuai kriteria filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FLOATING BULK ACTION BAR */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-primary/40 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
          <span className="text-xs font-bold text-foreground">
            <strong className="text-primary font-mono">{selectedUserIds.length}</strong> user terpilih
          </span>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkApprove}
              className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs shadow-sm cursor-pointer"
            >
              <Check className="h-4 w-4 mr-1" /> Approve Semua
            </Button>

            <Button
              size="sm"
              variant="danger"
              onClick={handleBulkReject}
              className="font-bold text-xs shadow-sm cursor-pointer"
            >
              <X className="h-4 w-4 mr-1" /> Reject Semua
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedUserIds([])}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* SINGLE ACTION CONFIRMATION MODALS */}
      {selectedUser && actionType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'p-3 rounded-xl',
                  actionType === 'approve'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : actionType === 'delete' || actionType === 'reject'
                    ? 'bg-destructive/15 text-destructive border border-destructive/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                )}
              >
                {actionType === 'approve' ? <Check className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-foreground">
                  {actionType === 'approve' && 'Konfirmasi Setujui Akun User'}
                  {actionType === 'reject' && 'Konfirmasi Penolakan Pendaftaran'}
                  {actionType === 'suspend' && 'Konfirmasi Status Suspen User'}
                  {actionType === 'delete' && 'Konfirmasi Hapus User Permanen'}
                  {actionType === 'plan' && 'Konfirmasi Ubah Plan User'}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">{selectedUser.email}</p>
              </div>
            </div>

            {actionType === 'approve' && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Setujui akun <strong>{selectedUser.name}</strong>? Status akan diubah menjadi <strong className="text-emerald-400">Active</strong> dan email pemberitahuan pengaktifan akan dikirimkan.
              </p>
            )}

            {actionType === 'reject' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tolak pendaftaran <strong>{selectedUser.name}</strong>? Status akun akan diubah menjadi <strong className="text-destructive">Rejected</strong>.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-foreground">
                    Alasan Penolakan (Internal Admin)
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Format nama/nomor HP tidak valid"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-destructive"
                  />
                </div>
              </div>
            )}

            {actionType === 'delete' && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl border border-destructive/20 font-semibold">
                  ⚠️ Perhatian: Seluruh koneksi MT5, jurnal, &amp; catatan user ini akan terhapus secara permanen dari database.
                </p>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Masukkan Password Admin (Re-authentikasi)
                  </label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Password admin..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:border-amber-500"
                  />
                  {reauthError && (
                    <span className="text-[11px] text-destructive block">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedUser(null)
                  setActionType(null)
                  setRejectReason('')
                  setAdminPassword('')
                  setReauthError('')
                }}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleActionExecute}
                className={cn(
                  'font-bold text-xs',
                  actionType === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
                    : actionType === 'delete' || actionType === 'reject'
                    ? 'bg-destructive text-white hover:bg-destructive/90'
                    : 'bg-amber-500 hover:bg-amber-600 text-black'
                )}
              >
                Eksekusi Aksi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 text-primary animate-spin" /></div>}>
      <AdminUsersContent />
    </Suspense>
  )
}
