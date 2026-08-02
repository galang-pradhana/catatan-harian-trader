'use client'

import React, { useState } from 'react'
import {
  Brain,
  Smile,
  Meh,
  Frown,
  Flame,
  Zap,
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const moodEmojis: Record<string, { label: string; emoji: string; color: string }> = {
  confident: { label: 'Percaya Diri', emoji: '😊', color: 'text-profit bg-profit/15 border-profit/30' },
  neutral:   { label: 'Netral',       emoji: '😐', color: 'text-foreground bg-muted border-border' },
  fomo:      { label: 'FOMO',         emoji: '😤', color: 'text-amber-500 bg-amber-500/15 border-amber-500/30' },
  anxious:   { label: 'Cemas',        emoji: '😰', color: 'text-blue-500 bg-blue-500/15 border-blue-500/30' },
  greedy:    { label: 'Serakah',      emoji: '🤑', color: 'text-purple-500 bg-purple-500/15 border-purple-500/30' },
}

export default function PsychologyPage() {
  const [activeTab, setActiveTab] = useState<'mood' | 'reflection' | 'triggers'>('mood')
  const [currentMonth, setCurrentMonth] = useState('Mei 2026')
  const [selectedDay, setSelectedDay] = useState(24)

  const [reflectionText, setReflectionText] = useState(
    'Mulai lebih sabar menunggu setup di H4 dan tidak overtrading. Emosi jauh lebih stabil saat mengatur lot sesuai risk 1%.'
  )

  // Dummy mood map per day
  const dayMoodMap: Record<number, string> = {
    3: 'confident', 6: 'confident', 7: 'fomo', 8: 'neutral', 9: 'confident',
    10: 'anxious', 13: 'confident', 14: 'fomo', 15: 'neutral', 16: 'confident',
    17: 'greedy', 20: 'fomo', 21: 'neutral', 22: 'fomo', 23: 'greedy', 24: 'confident',
    27: 'fomo', 28: 'confident', 29: 'neutral', 30: 'confident', 31: 'fomo'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Psikologi Trading &amp; Mood Tracker
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pantau kondisi emosi, tingkat disiplin, dan pemicu psikologis yang mempengaruhi keputusan trading Anda.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-card border border-border rounded-xl p-1 shadow-sm">
          {[
            { id: 'mood',       label: 'Mood Tracker' },
            { id: 'reflection', label: 'Refleksi' },
            { id: 'triggers',   label: 'Pemicu Emosi' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Mood Tracker Calendar Grid (2/3 width) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"><ChevronLeft className="h-4 w-4" /></Button>
              <h2 className="text-lg font-bold text-foreground px-2">{currentMonth}</h2>
              <Button variant="outline" size="sm"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Pilih Emosi Hari Ini:</span>
              <span className="text-base">😊 😐 😤 😰 🤑</span>
            </div>
          </div>

          {/* Grid Headers (Sen-Min) */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase py-1">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={`pad-${i}`} className="h-16 rounded-xl bg-muted/10 border border-border/20 opacity-30" />
            ))}

            {Array.from({ length: 31 }).map((_, i) => {
              const dayNum = i + 1
              const moodKey = dayMoodMap[dayNum]
              const moodObj = moodKey ? moodEmojis[moodKey] : null
              const isSelected = selectedDay === dayNum

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={cn(
                    'h-16 rounded-xl p-2 border flex flex-col justify-between transition-all cursor-pointer select-none',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                      : moodObj
                      ? 'bg-card border-border/60 hover:border-primary/50'
                      : 'bg-card border-border/40 hover:bg-muted/20'
                  )}
                >
                  <span className="text-xs font-bold text-foreground">{dayNum}</span>
                  {moodObj ? (
                    <div className="flex items-center justify-between">
                      <span className="text-lg leading-none">{moodObj.emoji}</span>
                      <span className={cn('text-[9px] px-1 py-0.2 rounded font-semibold border', moodObj.color)}>
                        {moodObj.label.split(' ')[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground opacity-40">-</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Ringkasan Mood & Catatan Refleksi (1/3 width) */}
        <div className="space-y-5">
          {/* Card: Ringkasan Mood */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-foreground border-b border-border pb-3">
              Ringkasan Mood Bulanan
            </h3>

            <div className="space-y-3">
              {[
                { emoji: '😊', label: 'Percaya Diri', count: 12, pct: 43, color: 'bg-profit' },
                { emoji: '😐', label: 'Netral',       count: 10, pct: 36, color: 'bg-muted-foreground' },
                { emoji: '😤', label: 'FOMO',         count: 5,  pct: 18, color: 'bg-amber-500' },
                { emoji: '😰', label: 'Cemas',        count: 1,  pct: 3,  color: 'bg-blue-500' },
              ].map((m) => (
                <div key={m.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <span className="text-base">{m.emoji}</span> {m.label}
                    </span>
                    <span className="font-mono font-bold text-muted-foreground">
                      {m.count} ({m.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div className={cn('h-full rounded-full', m.color)} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Catatan Refleksi */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-foreground border-b border-border pb-3">
              Catatan Refleksi Emosi
            </h3>

            <textarea
              rows={4}
              value={reflectionText}
              onChange={(e) => setReflectionText(e.target.value)}
              placeholder="Tulis refleksi emosi dan pola pikir Anda..."
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y"
            />
            <Button variant="primary" size="sm" className="w-full text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Simpan Refleksi
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
