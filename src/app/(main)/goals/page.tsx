'use client'

import React, { useState } from 'react'
import { Trophy, Plus, CheckCircle2, Target, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Goal {
  id: string
  title: string
  target: string
  deadline: string
  progressPct: number
  status: 'active' | 'completed'
}

const initialGoals: Goal[] = [
  {
    id: '1',
    title: 'Profit Bulanan',
    target: '+10% Profit',
    deadline: '31 Mei 2026',
    progressPct: 65,
    status: 'active',
  },
  {
    id: '2',
    title: 'Konsistensi Trading',
    target: '20 Trade Disiplin',
    deadline: '31 Mei 2026',
    progressPct: 80,
    status: 'active',
  },
  {
    id: '3',
    title: 'Improve Win Rate',
    target: 'Target 70% Win Rate',
    deadline: '30 Juni 2026',
    progressPct: 60,
    status: 'active',
  },
]

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [newTitle, setNewTitle] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newDeadline, setNewDeadline] = useState('')

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle || !newTarget) return

    const newGoalItem: Goal = {
      id: String(Date.now()),
      title: newTitle,
      target: newTarget,
      deadline: newDeadline || '30 Hari',
      progressPct: 0,
      status: 'active',
    }
    setGoals([...goals, newGoalItem])
    setNewTitle('')
    setNewTarget('')
    setNewDeadline('')
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" /> Target &amp; Tujuan Trading
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Tetapkan target kuantitatif bulanan dan pantau tingkat ketercapaian disiplin trading Anda.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Tujuan Baru
        </Button>
      </div>

      {/* Goal Cards List */}
      <div className="space-y-4">
        {goals.map((g) => (
          <div key={g.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground">{g.title}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                  <span>Target: <strong className="text-foreground">{g.target}</strong></span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-primary" /> Deadline: {g.deadline}
                  </span>
                </p>
              </div>

              <span className="text-lg font-mono font-extrabold text-primary">
                {g.progressPct}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-muted/40 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-500"
                style={{ width: `${g.progressPct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Simple Add Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-foreground border-b border-border pb-3">Tambah Target Trading Baru</h3>

            <form onSubmit={handleAddGoal} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-foreground">Nama Target</label>
                <input
                  type="text"
                  placeholder="Contoh: Profit Bulanan +15%"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-foreground">Detail Target</label>
                <input
                  type="text"
                  placeholder="Contoh: Target +$500 / Winrate 75%"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-foreground">Deadline</label>
                <input
                  type="text"
                  placeholder="Contoh: 30 Juni 2026"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Batal</Button>
                <Button variant="primary" type="submit">Simpan Target</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
