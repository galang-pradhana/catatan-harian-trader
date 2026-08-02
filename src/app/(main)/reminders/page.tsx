'use client'

import React, { useState } from 'react'
import { Bell, Plus, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ReminderItem {
  id: string
  title: string
  schedule: string
  enabled: boolean
}

const initialReminders: ReminderItem[] = [
  {
    id: '1',
    title: 'Jangan lupa catat jurnal harian',
    schedule: 'Setiap hari, 20:00',
    enabled: true,
  },
  {
    id: '2',
    title: 'Evaluasi mingguan',
    schedule: 'Setiap Minggu, 19:00',
    enabled: true,
  },
  {
    id: '3',
    title: 'Review strategi & setup',
    schedule: 'Setiap Sabtu, 10:00',
    enabled: false,
  },
  {
    id: '4',
    title: 'Rencana trading bulanan',
    schedule: 'Tanggal 1 setiap bulan, 09:00',
    enabled: true,
  },
]

export default function RemindersPage() {
  const [reminders, setReminders] = useState<ReminderItem[]>(initialReminders)

  const toggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Pengingat Evaluasi &amp; Jurnal
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Atur notifikasi pengingat otomatis agar Anda tidak pernah melewatkan pencatatan jurnal dan evaluasi rutin.
          </p>
        </div>

        <Button variant="primary" size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> Pengingat Baru
        </Button>
      </div>

      {/* Reminders List */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
        {reminders.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-3.5">
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', r.enabled ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground')}>
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">{r.title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                  <Clock className="h-3.5 w-3.5 text-primary" /> {r.schedule}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              onClick={() => toggleReminder(r.id)}
              className={cn(
                'w-12 h-6 rounded-full transition-colors relative focus:outline-none p-1 cursor-pointer',
                r.enabled ? 'bg-primary' : 'bg-muted border border-border'
              )}
            >
              <div
                className={cn(
                  'w-4 h-4 rounded-full bg-white transition-transform shadow-md',
                  r.enabled ? 'translate-x-6' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
