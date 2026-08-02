'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TradeItem {
  id: string
  symbol: string
  direction: 'buy' | 'sell'
  pnl: number | null
  open_time: string
  status: string
}

async function fetchCalendarTrades() {
  const res = await fetch('/api/trades?limit=100')
  if (!res.ok) return []
  const json = await res.json()
  return json.trades ?? []
}

const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function CalendarPage() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()) // 0-indexed
  const [selectedDay, setSelectedDay] = useState(today.getDate())

  const [dailyNote, setDailyNote] = useState('Trading cukup baik hari ini. Disiplin mengikuti rencana dan tidak terburu-buru. Fokus pada setup yang jelas.')
  const [lessonToday, setLessonToday] = useState('Jangan serakah dan selalu pasang SL. Manajemen risiko adalah kunci.')

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['calendar-trades'],
    queryFn: fetchCalendarTrades,
    staleTime: 30_000,
  })

  // Map trades by date string YYYY-MM-DD
  const tradesByDate = new Map<string, TradeItem[]>()
  trades.forEach((t: TradeItem) => {
    if (!t.open_time) return
    const dStr = t.open_time.split('T')[0]
    const existing = tradesByDate.get(dStr) || []
    tradesByDate.set(dStr, [...existing, t])
  })

  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay()
  const paddingBefore = firstDayIndex === 0 ? 6 : firstDayIndex - 1

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const selectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
  const selectedTrades = tradesByDate.get(selectedDateStr) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" /> Kalender Jurnal Trading
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Visualisasi aktivitas trade dan evaluasi harian dalam tampilan kalender bulanan.
          </p>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Calendar (2/3 width) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          {/* Month Selector Controls */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-bold text-foreground px-2">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <Button variant="outline" size="sm" onClick={handleNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()); setSelectedDay(today.getDate()) }}>
              Hari Ini
            </Button>
          </div>

          {/* Grid Headers (Sen-Min) */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase py-1">
            {dayLabels.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: paddingBefore }).map((_, i) => (
              <div key={`pad-${i}`} className="min-h-[80px] rounded-xl bg-muted/10 border border-border/20 opacity-30" />
            ))}

            {Array.from({ length: totalDaysInMonth }).map((_, i) => {
              const dayNum = i + 1
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              const dayTrades = tradesByDate.get(dateStr) || []
              const isSelected = selectedDay === dayNum

              const totalPnl = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0)
              const hasTrades = dayTrades.length > 0
              const isProfit = totalPnl >= 0

              return (
                <div
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={cn(
                    'min-h-[85px] rounded-xl p-2 border flex flex-col justify-between transition-all cursor-pointer select-none',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 shadow-md'
                      : hasTrades
                      ? isProfit
                        ? 'bg-profit/10 border-profit/30 hover:border-profit/60'
                        : 'bg-loss/10 border-loss/30 hover:border-loss/60'
                      : 'bg-card border-border/60 hover:border-border hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn('text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center', isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground')}>
                      {dayNum}
                    </span>
                    {hasTrades && (
                      <span className={cn('text-[10px] font-mono font-bold px-1.5 py-0.5 rounded', isProfit ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss')}>
                        {isProfit ? '+' : ''}${Math.abs(totalPnl).toFixed(0)}
                      </span>
                    )}
                  </div>

                  {hasTrades && (
                    <div className="space-y-1 mt-1">
                      {dayTrades.slice(0, 2).map((t) => (
                        <div key={t.id} className="text-[10px] truncate flex items-center justify-between bg-black/20 dark:bg-white/5 px-1.5 py-0.5 rounded">
                          <span className="font-semibold text-foreground truncate">{t.symbol}</span>
                          <span className={cn('font-mono font-bold', (t.pnl || 0) >= 0 ? 'text-profit' : 'text-loss')}>
                            {(t.pnl || 0) >= 0 ? '+' : ''}${t.pnl?.toFixed(0) ?? 0}
                          </span>
                        </div>
                      ))}
                      {dayTrades.length > 2 && (
                        <span className="text-[9px] text-muted-foreground block text-right font-medium">
                          +{dayTrades.length - 2} lagi
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Jurnal & Catatan Hari Ini (1/3 width) */}
        <div className="space-y-5">
          {/* Card: Jurnal di Tanggal Ini */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Jurnal di Tanggal Ini</h3>
                <p className="text-xs text-primary font-semibold mt-0.5">
                  {selectedDay} {monthNames[currentMonth]} {currentYear}
                </p>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted font-bold text-foreground border border-border">
                {selectedTrades.length} Trade
              </span>
            </div>

            {selectedTrades.length > 0 ? (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {selectedTrades.map((t) => {
                  const isBuy = t.direction === 'buy'
                  const isProf = (t.pnl || 0) >= 0
                  return (
                    <div key={t.id} className="flex items-center justify-between bg-muted/30 border border-border/60 rounded-xl p-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs', isBuy ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss')}>
                          {isBuy ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-foreground block">{t.symbol}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{t.direction}</span>
                        </div>
                      </div>
                      <span className={cn('font-mono font-bold text-xs', isProf ? 'text-profit' : 'text-loss')}>
                        {isProf ? '+' : ''}${t.pnl?.toFixed(2) ?? '0.00'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                Tidak ada trade pada tanggal ini.
              </div>
            )}
          </div>

          {/* Card: Catatan Harian */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
              Catatan Harian
            </h3>
            <textarea
              rows={3}
              value={dailyNote}
              onChange={(e) => setDailyNote(e.target.value)}
              placeholder="Tulis catatan evaluasi harian di sini..."
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y"
            />

            <h4 className="text-xs font-bold text-foreground pt-1 uppercase tracking-wider">
              Pelajaran Hari Ini
            </h4>
            <textarea
              rows={2}
              value={lessonToday}
              onChange={(e) => setLessonToday(e.target.value)}
              placeholder="Apa pelajaran penting hari ini..."
              className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y"
            />
            <Button variant="primary" size="sm" className="w-full text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Simpan Catatan Harian
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
