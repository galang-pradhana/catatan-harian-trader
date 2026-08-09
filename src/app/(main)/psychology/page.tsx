'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Brain,
  Flame,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Filter,
  BarChart3,
  Calendar as CalendarIcon,
  Tag,
  Tags,
  BookOpen,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Smile,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getNotesForDate } from '@/utils/notes-storage'
import {
  EMOTION_TAXONOMY,
  EMOTION_CATEGORY_DEFS,
  PRESET_TRIGGER_TAGS,
  getEmotionByKey,
} from '@/constants/psychology'
import {
  EmotionOption,
  TriggerTagOption,
  DailyPsychologyLog,
  EmotionCategoryKey,
  PsychologyAnalyticsSummary,
} from '@/types/psychology'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

export default function PsychologyPage() {
  const [activeTab, setActiveTab] = useState<'mood' | 'analytics' | 'reflection' | 'triggers'>('mood')
  
  // Date state (defaults to current month)
  const now = new Date()
  const [currentYear, setCurrentYear] = useState(now.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1) // 1-12
  const [selectedDay, setSelectedDay] = useState<number>(now.getDate())

  // Data states
  const [isLoading, setIsLoading] = useState(true)
  const [logsMap, setLogsMap] = useState<Record<string, DailyPsychologyLog>>({})
  const [autoSuggestedMoods, setAutoSuggestedMoods] = useState<Record<string, { emotion: string; category: string; count: number }>>({})
  const [tradeSummaryMap, setTradeSummaryMap] = useState<Record<string, { tradesCount: number; winsCount: number; lossesCount: number; totalPnl: number; tradesList?: any[] }>>({})
  const [disciplineStreak, setDisciplineStreak] = useState(0)
  const [analytics, setAnalytics] = useState<PsychologyAnalyticsSummary | null>(null)

  // Trade level analytics states
  const [disciplineStats, setDisciplineStats] = useState<Array<{ discipline: string; label: string; tradesCount: number; winsCount: number; lossesCount: number; winRate: number; totalPnl: number }>>([])
  const [tradeMistakeRankings, setTradeMistakeRankings] = useState<Array<{ tagId: string; tagName: string; tagColor: string; count: number; lossCount: number; totalPnl: number }>>([])
  const [strategyRankings, setStrategyRankings] = useState<Array<{ strategyId: string; strategyName: string; strategyColor: string; tradesCount: number; winsCount: number; lossesCount: number; winRate: number; avgPnlPerTrade: number; totalPnl: number }>>([])

  // Drill-down Modal state
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false)
  const [drilldownDate, setDrilldownDate] = useState<string | null>(null)

  // Custom trigger tags library
  const [customTriggers, setCustomTriggers] = useState<TriggerTagOption[]>([])
  const [newCustomTagInput, setNewCustomTagInput] = useState('')
  const [isAddTagModalOpen, setIsAddTagModalOpen] = useState(false)

  // Selected Day Form states
  const [selectedEmotion, setSelectedEmotion] = useState<string>('confident')
  const [selectedTriggerTags, setSelectedTriggerTags] = useState<string[]>([])
  const [reflectionText, setReflectionText] = useState('')
  const [isSavingLog, setIsSavingLog] = useState(false)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  // Reflection Tab Filter states
  const [reflectionFilterCategory, setReflectionFilterCategory] = useState<string>('all')
  const [reflectionFilterTag, setReflectionFilterTag] = useState<string>('all')

  const monthParam = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  const selectedDateStr = `${monthParam}-${String(selectedDay).padStart(2, '0')}`

  // All available trigger tags (Preset + Custom)
  const allTriggerTags = useMemo(() => {
    return [...PRESET_TRIGGER_TAGS, ...customTriggers]
  }, [customTriggers])

  // Fetch psychology logs and custom triggers
  const fetchData = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch logs & analytics for monthParam
      const res = await fetch(`/api/psychology/logs?month=${monthParam}`)
      if (res.ok) {
        const json = await res.json()
        const lMap: Record<string, DailyPsychologyLog> = {}
        if (Array.isArray(json.logs)) {
          json.logs.forEach((item: any) => {
            lMap[item.log_date] = {
              id: item.id,
              logDate: item.log_date,
              emotion: item.emotion,
              category: item.category,
              triggerTags: item.trigger_tags || [],
              reflectionNote: item.reflection_note || '',
            }
          })
        }
        setLogsMap(lMap)
        setAutoSuggestedMoods(json.autoSuggestedMoods || {})

        const tMap: Record<string, any> = {}
        if (Array.isArray(json.tradeSummaries)) {
          json.tradeSummaries.forEach((ts: any) => {
            tMap[ts.date] = ts
          })
        }
        setTradeSummaryMap(tMap)

        setDisciplineStreak(json.disciplineStreak || 0)
        setDisciplineStats(json.disciplineStats || [])
        setTradeMistakeRankings(json.tradeMistakeRankings || [])
        setStrategyRankings(json.strategyRankings || [])

        setAnalytics({
          disciplineStreak: json.disciplineStreak || 0,
          totalLogsCount: Object.keys(lMap).length,
          positivePercentage: 0,
          categoryBreakdown: json.categoryBreakdown || [],
          triggerTagRankings: json.triggerTagRankings || [],
          keyInsights: json.keyInsights || [],
          emotionTrend: [],
        })
      }

      // 2. Fetch custom trigger tags
      const trigRes = await fetch('/api/psychology/triggers')
      if (trigRes.ok) {
        const trigJson = await trigRes.json()
        if (Array.isArray(trigJson.triggers)) {
          setCustomTriggers(
            trigJson.triggers.map((t: any) => ({
              id: t.id || t.name,
              label: t.name,
              isCustom: true,
            }))
          )
        }
      }
    } catch (e) {
      console.error('Failed to load psychology data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [monthParam])

  // Sync selected day form whenever selectedDay, logsMap, or autoSuggestedMoods changes
  useEffect(() => {
    const existingLog = logsMap[selectedDateStr]
    if (existingLog) {
      setSelectedEmotion(existingLog.emotion)
      setSelectedTriggerTags(existingLog.triggerTags || [])
      setReflectionText(existingLog.reflectionNote || '')
    } else if (autoSuggestedMoods[selectedDateStr]) {
      setSelectedEmotion(autoSuggestedMoods[selectedDateStr].emotion)
      setSelectedTriggerTags([])
      setReflectionText('')
    } else {
      setSelectedEmotion('confident')
      setSelectedTriggerTags([])
      setReflectionText('')
    }
    setSaveSuccessMsg('')
  }, [selectedDateStr, logsMap, autoSuggestedMoods])

  // Save/Update Daily Log
  const handleSaveDailyLog = async () => {
    setIsSavingLog(true)
    setSaveSuccessMsg('')
    try {
      const res = await fetch('/api/psychology/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_date: selectedDateStr,
          emotion: selectedEmotion,
          trigger_tags: selectedTriggerTags,
          reflection_note: reflectionText,
        }),
      })

      if (res.ok) {
        setSaveSuccessMsg('✓ Log emosi berhasil disimpan!')
        fetchData()
        setTimeout(() => setSaveSuccessMsg(''), 3000)
      } else {
        const json = await res.json()
        alert(json.message || 'Gagal menyimpan log emosi')
      }
    } catch (e) {
      alert('Terjadi kesalahan koneksi saat menyimpan')
    } finally {
      setIsSavingLog(false)
    }
  }

  // Add Custom Trigger Tag
  const handleAddCustomTag = async () => {
    if (!newCustomTagInput.trim()) return
    try {
      const res = await fetch('/api/psychology/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustomTagInput.trim() }),
      })
      if (res.ok) {
        const json = await res.json()
        const created = json.tag
        const newTagOpt: TriggerTagOption = {
          id: created.id || created.name,
          label: created.name,
          isCustom: true,
        }
        setCustomTriggers((prev) => [...prev, newTagOpt])
        setSelectedTriggerTags((prev) => [...prev, newTagOpt.id])
        setNewCustomTagInput('')
        setIsAddTagModalOpen(false)
      }
    } catch (e) {
      alert('Gagal menambah tag custom')
    }
  }

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  // Days in month calculation
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayWeekday = (new Date(currentYear, currentMonth - 1, 1).getDay() + 6) % 7 // Monday-indexed 0..6

  // Filtered reflections for Reflection Tab
  const allReflectionsList = useMemo(() => {
    return Object.values(logsMap)
      .filter((log) => log.reflectionNote && log.reflectionNote.trim().length > 0)
      .filter((log) => {
        if (reflectionFilterCategory !== 'all') {
          const emoObj = getEmotionByKey(log.emotion)
          if (emoObj.category !== reflectionFilterCategory && log.emotion !== reflectionFilterCategory) {
            return false
          }
        }
        if (reflectionFilterTag !== 'all') {
          if (!log.triggerTags.includes(reflectionFilterTag)) return false
        }
        return true
      })
      .sort((a, b) => new Date(b.logDate).getTime() - new Date(a.logDate).getTime())
  }, [logsMap, reflectionFilterCategory, reflectionFilterTag])

  // Current selected emotion object
  const currentEmotionObj = getEmotionByKey(selectedEmotion)

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2 tracking-tight">
              <Brain className="h-7 w-7 text-primary shrink-0" /> Psikologi Trading &amp; Mood Tracker
            </h1>
            {/* Discipline Streak Counter Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/30 text-amber-400 text-xs font-black shadow-xs animate-pulse">
              <Flame className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />
              <span>Streak Disiplin: {disciplineStreak} Hari</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Analisis korelasi kondisi emosi, tingkat disiplin, dan pemicu psikologis terhadap performa trading Anda.
          </p>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-xs overflow-x-auto">
          {[
            { id: 'mood',      label: 'Mood Tracker', icon: Smile },
            { id: 'analytics', label: 'Pola & Insight', icon: BarChart3 },
            { id: 'reflection',label: 'Refleksi',    icon: BookOpen },
            { id: 'triggers',  label: 'Pemicu Emosi',icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* TAB 1: MOOD TRACKER (Calendar Grid + Day Logger) */}
      {activeTab === 'mood' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT: CALENDAR GRID (2/3 width) */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            {/* Month Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevMonth} className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="text-base sm:text-lg font-extrabold text-foreground px-2 min-w-[140px] text-center font-mono">
                  {MONTH_NAMES[currentMonth - 1]} {currentYear}
                </h2>
                <Button variant="outline" size="sm" onClick={handleNextMonth} className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Taxonomy Color Legend */}
              <div className="flex items-center gap-2 flex-wrap text-[10px] font-bold">
                <span className="text-muted-foreground">Legend:</span>
                <span className="px-1.5 py-0.5 rounded border border-border bg-muted/30 text-foreground flex items-center gap-1">
                  <span>🔄</span> Auto-Suggest
                </span>
                {(Object.keys(EMOTION_CATEGORY_DEFS) as EmotionCategoryKey[]).map((catKey) => {
                  const def = EMOTION_CATEGORY_DEFS[catKey]
                  return (
                    <span key={catKey} className={cn('px-2 py-0.5 rounded border', def.badgeColor)}>
                      {def.label.split('/')[0]}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Days Weekday Header (Sen - Min) */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase py-1">
              {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Padding empty slots for month start weekday offset */}
              {Array.from({ length: firstDayWeekday }).map((_, i) => (
                <div key={`pad-${i}`} className="h-20 rounded-xl bg-muted/10 border border-border/20 opacity-30" />
              ))}

              {/* Actual Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dateStr = `${monthParam}-${String(dayNum).padStart(2, '0')}`
                const log = logsMap[dateStr]
                const autoSuggested = autoSuggestedMoods[dateStr]
                const isManualLog = Boolean(log)
                const isAutoSuggested = !isManualLog && Boolean(autoSuggested)
                const emoObj = isManualLog
                  ? getEmotionByKey(log.emotion)
                  : isAutoSuggested
                  ? getEmotionByKey(autoSuggested.emotion)
                  : null
                const tradeSum = tradeSummaryMap[dateStr]
                const isSelected = selectedDay === dayNum

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDay(dayNum)}
                    className={cn(
                      'h-20 rounded-xl p-2 border flex flex-col justify-between transition-all cursor-pointer select-none group relative overflow-hidden',
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 bg-primary/10 shadow-md z-10'
                        : emoObj
                        ? 'bg-card border-border hover:border-primary/50'
                        : 'bg-card border-border/40 hover:bg-muted/30'
                    )}
                  >
                    {/* Day Number Header & Emotion Emoji */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'text-xs font-black font-mono',
                          isSelected ? 'text-primary font-extrabold' : 'text-foreground'
                        )}
                      >
                        {dayNum}
                      </span>
                      {emoObj && (
                        <span className="text-base leading-none group-hover:scale-110 transition-transform flex items-center gap-0.5">
                          {emoObj.emoji}
                        </span>
                      )}
                    </div>

                    {/* Emotion Category Badge */}
                    {emoObj ? (
                      <div className="mt-0.5">
                        <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.2 rounded border truncate flex items-center justify-center gap-0.5 text-center', emoObj.badgeColor)}>
                          {isAutoSuggested && (
                            <span className="inline-block text-[9px] shrink-0" title="Auto-suggest dari emosi trade hari ini">
                              🔄
                            </span>
                          )}
                          <span className="truncate">{emoObj.label}</span>
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-30 italic font-mono">-</span>
                    )}

                    {/* Auto-link Daily Trade Summary Sub-label */}
                    {tradeSum && tradeSum.tradesCount > 0 ? (
                      <div className="text-[9px] font-mono font-bold pt-0.5 border-t border-border/40 flex items-center justify-between truncate text-muted-foreground">
                        <span>{tradeSum.tradesCount}T • {tradeSum.winsCount}W/{tradeSum.lossesCount}L</span>
                        <span className={cn(tradeSum.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {tradeSum.totalPnl >= 0 ? '+' : ''}${tradeSum.totalPnl.toFixed(0)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                        Klik isi log
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT: DAY LOG & REFLECTION FORM (1/3 width) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span>Log Emosi {selectedDay} {MONTH_NAMES[currentMonth - 1]}</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  {selectedDateStr}
                </p>
                {getNotesForDate(selectedDateStr).length > 0 && (
                  <Link
                    href={`/notes?date=${selectedDateStr}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline mt-1 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/30"
                  >
                    📝 {getNotesForDate(selectedDateStr).length} Catatan →
                  </Link>
                )}
              </div>

              {/* Trade summary for selected date */}
              {tradeSummaryMap[selectedDateStr] && tradeSummaryMap[selectedDateStr].tradesCount > 0 && (
                <div className="text-right text-xs font-mono">
                  <span className="font-bold block text-foreground">
                    {tradeSummaryMap[selectedDateStr].tradesCount} Trade
                  </span>
                  <span className={cn('font-bold block', tradeSummaryMap[selectedDateStr].totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {tradeSummaryMap[selectedDateStr].totalPnl >= 0 ? '+' : ''}${tradeSummaryMap[selectedDateStr].totalPnl.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDrilldownDate(selectedDateStr)
                      setIsDrilldownOpen(true)
                    }}
                    className="text-[10px] font-extrabold text-primary hover:underline flex items-center justify-end gap-1 mt-1 cursor-pointer ml-auto"
                  >
                    <Eye className="h-3 w-3" /> Lihat Trade
                  </button>
                </div>
              )}
            </div>

            {/* 1. EMOTION SELECTOR (TAXONOMY BY 5 CATEGORIES) */}
            <div className="space-y-3">
              <label className="text-xs font-extrabold text-foreground block uppercase tracking-wider">
                1. Pilih Emosi Utama Hari Ini:
              </label>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {(Object.keys(EMOTION_CATEGORY_DEFS) as EmotionCategoryKey[]).map((catKey) => {
                  const catDef = EMOTION_CATEGORY_DEFS[catKey]
                  const categoryEmotions = EMOTION_TAXONOMY.filter((e) => e.category === catKey)

                  return (
                    <div key={catKey} className="space-y-1.5">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {catDef.label}
                      </span>

                      <div className="grid grid-cols-2 gap-1.5">
                        {categoryEmotions.map((emo) => {
                          const isSelected = selectedEmotion === emo.key
                          return (
                            <button
                              key={emo.key}
                              type="button"
                              onClick={() => setSelectedEmotion(emo.key)}
                              className={cn(
                                'p-2 rounded-xl border flex items-center gap-2 text-xs font-bold transition-all text-left cursor-pointer',
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/30 shadow-xs'
                                  : 'bg-muted/30 border-border hover:border-primary/40 text-foreground'
                              )}
                            >
                              <span className="text-base leading-none">{emo.emoji}</span>
                              <span className="truncate">{emo.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 2. TRIGGER TAGS SELECTOR (PRESET + CUSTOM) */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-foreground uppercase tracking-wider">
                  2. Pemicu Emosi (Trigger Tags):
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddTagModalOpen(true)}
                  className="text-[11px] text-primary hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Custom Tag
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {allTriggerTags.map((tag) => {
                  const isChecked = selectedTriggerTags.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        setSelectedTriggerTags((prev) =>
                          prev.includes(tag.id) ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                        )
                      }}
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer',
                        isChecked
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                          : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {isChecked ? '✓ ' : ''}{tag.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. REFLECTION TEXTAREA */}
            <div className="space-y-2 pt-2 border-t border-border">
              <label className="text-xs font-extrabold text-foreground uppercase tracking-wider block">
                3. Catatan Refleksi Emosi:
              </label>
              <textarea
                rows={3}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Tuliskan refleksi emosi, pemicu, atau pelajaran berharga hari ini..."
                className="w-full bg-background border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y"
              />
            </div>

            {/* SAVE BUTTON & FEEDBACK */}
            <div className="space-y-2">
              <Button
                variant="primary"
                onClick={handleSaveDailyLog}
                disabled={isSavingLog}
                className="w-full text-xs font-extrabold h-10 shadow-sm"
              >
                {isSavingLog ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Simpan Log Emosi Hari Ini
                  </>
                )}
              </Button>

              {saveSuccessMsg && (
                <p className="text-xs text-emerald-400 font-bold text-center animate-in fade-in">
                  {saveSuccessMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: POLA & INSIGHT (ANALYTICS & CORRELATIONS) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* AUTOMATED KEY INSIGHT CALLOUTS */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" /> Insight Otomatis Performa Emosi
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analytics?.keyInsights && analytics.keyInsights.length > 0 ? (
                analytics.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 shadow-xs"
                  >
                    <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground font-semibold leading-relaxed">
                      {insight}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-card border border-border text-center text-xs text-muted-foreground col-span-2">
                  Belum ada cukup log emosi untuk menghasilkan insight otomatis.
                </div>
              )}
            </div>
          </div>

          {/* EMOTION CATEGORY CORRELATION TABLE */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-foreground border-b border-border pb-3">
              📊 Tabel Korelasi Emosi vs Performa Trading
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase text-[10px] font-extrabold">
                    <th className="py-2.5 px-3">Kategori Emosi</th>
                    <th className="py-2.5 px-3 text-center">Hari Tercatat</th>
                    <th className="py-2.5 px-3 text-center">Total Trade</th>
                    <th className="py-2.5 px-3 text-center">Win Rate</th>
                    <th className="py-2.5 px-3 text-right">Rata-rata PnL / Trade</th>
                    <th className="py-2.5 px-3 text-right">Total Net PnL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 font-mono">
                  {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                    analytics.categoryBreakdown.map((cat) => {
                      const isProfit = cat.totalPnl >= 0
                      return (
                        <tr key={cat.category} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3">
                            <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold border inline-block', cat.badgeColor)}>
                              {cat.categoryLabel}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-foreground">
                            {cat.daysCount} Hari
                          </td>
                          <td className="py-3 px-3 text-center text-muted-foreground">
                            {cat.tradesCount} Trade
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className={cn(cat.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400')}>
                              {cat.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold">
                            <span className={cn(cat.avgPnlPerTrade >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {cat.avgPnlPerTrade >= 0 ? '+' : ''}${cat.avgPnlPerTrade.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-sm">
                            <span className={cn(isProfit ? 'text-emerald-400' : 'text-red-400')}>
                              {isProfit ? '+' : ''}${cat.totalPnl.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Belum ada data korelasi emosi untuk bulan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* TRIGGER TAG LOSS RANKINGS (EMOTIONAL CONTEXT) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold text-foreground border-b border-border pb-3 flex items-center justify-between">
              <span>📌 Ranking Tag Pemicu Emosi Harian</span>
              <span className="text-[11px] font-mono text-muted-foreground">Konteks Emosional Harian</span>
            </h3>

            {analytics?.triggerTagRankings && analytics.triggerTagRankings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analytics.triggerTagRankings.map((tag, idx) => (
                  <div
                    key={tag.tagId}
                    className="p-3.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold font-mono text-muted-foreground w-5 text-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-extrabold text-foreground block">
                          {tag.tagLabel}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Tercatat {tag.occurrenceCount}x • {tag.lossTradesCount} trade loss
                        </span>
                      </div>
                    </div>
                    <span className={cn('font-bold font-mono text-sm', tag.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {tag.totalPnl >= 0 ? '+' : ''}${tag.totalPnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada tag pemicu yang tercatat untuk bulan ini.
              </p>
            )}
          </div>

          {/* TRADE DISCIPLINE METRICS (TRADE LEVEL) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" /> Analisis Kedisiplinan Eksekusi Trade
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">Level Trade Individual</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {disciplineStats.map((d) => {
                const isYes = d.discipline === 'yes'
                const isProfit = d.totalPnl >= 0
                return (
                  <div
                    key={d.discipline}
                    className={cn(
                      'p-4 rounded-2xl border space-y-3',
                      isYes ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs font-black px-2.5 py-1 rounded-full border flex items-center gap-1.5', isYes ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-red-500/20 text-red-300 border-red-500/40')}>
                        {isYes ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                        {d.label}
                      </span>
                      <span className="text-xs font-bold text-muted-foreground font-mono">
                        {d.tradesCount} Trade ({d.winsCount}W / {d.lossesCount}L)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 font-mono">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Win Rate</span>
                        <span className={cn('text-lg font-black', d.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400')}>
                          {d.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Net PnL</span>
                        <span className={cn('text-lg font-black', isProfit ? 'text-emerald-400' : 'text-red-400')}>
                          {isProfit ? '+' : ''}${d.totalPnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* TRADE MISTAKE TAGS RANKINGS (EXECUTION CONTEXT) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" /> Tag Kesalahan Eksekusi Trade (Drawer Jurnal)
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">Konteks Eksekusi Trade</span>
            </div>

            {tradeMistakeRankings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tradeMistakeRankings.map((tag, idx) => (
                  <div
                    key={tag.tagId}
                    className="p-3.5 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold font-mono text-muted-foreground w-5 text-center">
                        #{idx + 1}
                      </span>
                      <div>
                        <span className="font-extrabold text-foreground block">
                          {tag.tagName}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Tercatat {tag.count}x • {tag.lossCount} trade loss
                        </span>
                      </div>
                    </div>
                    <span className={cn('font-bold font-mono text-sm', tag.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                      {tag.totalPnl >= 0 ? '+' : ''}${tag.totalPnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada tag kesalahan trade yang tercatat pada jurnal trade.
              </p>
            )}
          </div>

          {/* TRADE STRATEGY PERFORMANCE METRICS */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Tags className="h-5 w-5 text-amber-400" /> Analisis Performa Per Setup Strategi
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">Setup Master Data</span>
            </div>

            {strategyRankings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase text-[10px] font-extrabold">
                      <th className="py-2.5 px-3">Setup Strategi</th>
                      <th className="py-2.5 px-3 text-center">Total Trade</th>
                      <th className="py-2.5 px-3 text-center">Win Rate</th>
                      <th className="py-2.5 px-3 text-right">Rata-rata PnL / Trade</th>
                      <th className="py-2.5 px-3 text-right">Total Net PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {strategyRankings.map((strat) => {
                      const isProfit = strat.totalPnl >= 0
                      return (
                        <tr key={strat.strategyId} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-3">
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5"
                              style={{
                                backgroundColor: `${strat.strategyColor}20`,
                                borderColor: `${strat.strategyColor}60`,
                                color: strat.strategyColor,
                              }}
                            >
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: strat.strategyColor }} />
                              {strat.strategyName}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-foreground">
                            {strat.tradesCount} Trade ({strat.winsCount}W / {strat.lossesCount}L)
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            <span className={cn(strat.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400')}>
                              {strat.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold">
                            <span className={cn(strat.avgPnlPerTrade >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                              {strat.avgPnlPerTrade >= 0 ? '+' : ''}${strat.avgPnlPerTrade.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-extrabold text-sm">
                            <span className={cn(isProfit ? 'text-emerald-400' : 'text-red-400')}>
                              {isProfit ? '+' : ''}${strat.totalPnl.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                Belum ada strategi yang diisikan pada jurnal trade bulan ini.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REFLEKSI (CATATAN EMOSI WITH FILTERS) */}
      {activeTab === 'reflection' && (
        <div className="space-y-5">
          {/* FILTER BAR */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Filter className="h-4 w-4 text-primary" />
              <span>Filter Catatan Refleksi:</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Category / Emotion Filter */}
              <select
                value={reflectionFilterCategory}
                onChange={(e) => setReflectionFilterCategory(e.target.value)}
                className="h-9 rounded-xl bg-background border border-border px-3 text-xs font-semibold"
              >
                <option value="all">Semua Kategori / Emosi</option>
                <option value="positive">Kategori: Positif/Sehat</option>
                <option value="fear">Kategori: Takut/Ragu</option>
                <option value="greed">Kategori: Serakah-driven</option>
                <option value="impulsive">Kategori: Impulsif/Pasca-loss</option>
                <option value="other">Kategori: Lainnya</option>
                {EMOTION_TAXONOMY.map((emo) => (
                  <option key={emo.key} value={emo.key}>
                    Emosi: {emo.emoji} {emo.label}
                  </option>
                ))}
              </select>

              {/* Trigger Tag Filter */}
              <select
                value={reflectionFilterTag}
                onChange={(e) => setReflectionFilterTag(e.target.value)}
                className="h-9 rounded-xl bg-background border border-border px-3 text-xs font-semibold"
              >
                <option value="all">Semua Tag Pemicu</option>
                {allTriggerTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    Tag: {tag.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* REFLECTION LIST */}
          <div className="space-y-3">
            {allReflectionsList.length > 0 ? (
              allReflectionsList.map((log) => {
                const emoObj = getEmotionByKey(log.emotion)
                return (
                  <div
                    key={log.logDate}
                    className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2 hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black font-mono text-foreground">
                          {log.logDate}
                        </span>
                        <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded border', emoObj.badgeColor)}>
                          {emoObj.emoji} {emoObj.label}
                        </span>
                      </div>

                      {/* Trigger tags pills */}
                      <div className="flex flex-wrap gap-1">
                        {log.triggerTags.map((tId) => {
                          const tagObj = allTriggerTags.find((t) => t.id === tId)
                          return (
                            <span key={tId} className="text-[9px] font-bold px-2 py-0.2 rounded-full bg-muted/60 text-muted-foreground border border-border">
                              #{tagObj ? tagObj.label : tId}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    <p className="text-xs text-foreground leading-relaxed italic bg-muted/20 p-3 rounded-xl border border-border/50">
                      "{log.reflectionNote}"
                    </p>
                  </div>
                )
              })
            ) : (
              <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-xs text-muted-foreground font-medium">
                  Belum ada catatan refleksi yang cocok dengan filter yang dipilih.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PEMICU EMOSI (TRIGGER TAGS LIBRARY MANAGER) */}
      {activeTab === 'triggers' && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" /> Library Tag Pemicu Emosi
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Kelola preset dan pemicu emosi pribadi yang dapat Anda gunakan saat mengisi log harian.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddTagModalOpen(true)}
              className="text-xs font-extrabold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Tambah Custom Tag
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allTriggerTags.map((tag) => (
              <div
                key={tag.id}
                className="p-3 rounded-xl bg-muted/30 border border-border flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="font-bold text-foreground truncate">{tag.label}</span>
                </div>
                {tag.isCustom && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Custom
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH CUSTOM TAG */}
      {isAddTagModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Tambah Tag Pemicu Custom
            </h3>
            <p className="text-xs text-muted-foreground">
              Masukkan pemicu psikologis spesifik pribadi Anda (contoh: "Keluarga ganggu jam trading").
            </p>

            <Input
              value={newCustomTagInput}
              onChange={(e) => setNewCustomTagInput(e.target.value)}
              placeholder="Nama tag pemicu..."
              className="text-xs"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddTagModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddCustomTag}
                disabled={!newCustomTagInput.trim()}
                className="text-xs font-bold"
              >
                Simpan Tag
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DRILL-DOWN TRADE HARIAN (READ-ONLY) */}
      {isDrilldownOpen && drilldownDate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div>
                <h3 className="text-base font-extrabold text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  Daftar Trade — {drilldownDate}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  {tradeSummaryMap[drilldownDate]?.tradesCount || 0} Trade • Total PnL:{' '}
                  <span className={cn('font-bold', (tradeSummaryMap[drilldownDate]?.totalPnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                    {(tradeSummaryMap[drilldownDate]?.totalPnl || 0) >= 0 ? '+' : ''}${tradeSummaryMap[drilldownDate]?.totalPnl.toFixed(2)}
                  </span>
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => setIsDrilldownOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Trades List (Read-Only) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {tradeSummaryMap[drilldownDate]?.tradesList && tradeSummaryMap[drilldownDate].tradesList.length > 0 ? (
                tradeSummaryMap[drilldownDate].tradesList.map((tr: any) => {
                  const trBuy = tr.direction === 'buy'
                  const isProfit = (tr.pnl || 0) >= 0
                  const tradeEmoObj = tr.mood ? getEmotionByKey(tr.mood) : null

                  return (
                    <div
                      key={tr.id}
                      className="p-3 rounded-xl bg-muted/20 border border-border/80 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-[9px] font-bold uppercase px-1.5 py-0.5 rounded', trBuy ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300')}>
                            {tr.direction}
                          </span>
                          <span className="font-extrabold text-foreground">{tr.symbol}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{tr.volume} Lot</span>
                          {tr.mt5TicketId && (
                            <span className="text-[9px] font-mono text-muted-foreground">#{tr.mt5TicketId}</span>
                          )}
                        </div>

                        {/* Outcome badge */}
                        <div className="flex items-center gap-2 font-mono">
                          {tr.status !== 'open' && tr.pnl !== undefined && (
                            <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.2 rounded text-white tracking-wider', tr.pnl > 0 ? 'bg-emerald-600' : tr.pnl < 0 ? 'bg-red-600' : 'bg-slate-600')}>
                              {tr.pnl > 0 ? 'WIN' : tr.pnl < 0 ? 'LOSS' : 'BE'}
                            </span>
                          )}
                          <span className={cn('font-bold', isProfit ? 'text-emerald-400' : 'text-red-400')}>
                            {tr.pnl !== undefined ? `${isProfit ? '+' : ''}$${tr.pnl.toFixed(2)}` : 'Running'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground font-mono">In: {tr.openPrice} • Out: {tr.closePrice ?? '-'}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Trade Emotion Entry Badge */}
                          {tradeEmoObj ? (
                            <span className={cn('text-[9px] font-bold px-2 py-0.2 rounded border', tradeEmoObj.badgeColor)}>
                              {tradeEmoObj.emoji} {tradeEmoObj.label}
                            </span>
                          ) : (
                            <span className="text-muted-foreground opacity-50 italic">Belum ada emosi</span>
                          )}

                          {/* Discipline Badge */}
                          {tr.discipline === 'yes' ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Ikut Rules ✓
                            </span>
                          ) : tr.discipline === 'no' ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                              Melanggar Rules ✗
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  Tidak ada trade yang tercatat pada tanggal ini.
                </p>
              )}
            </div>

            {/* Footer info note */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
              <span className="italic opacity-80">
                ℹ️ Pengeditan emosi per-trade dilakukan dari drawer jurnal di menu Daftar Trade.
              </span>
              <Button variant="outline" size="sm" onClick={() => setIsDrilldownOpen(false)} className="text-xs font-bold">
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
