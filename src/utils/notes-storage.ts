export type NoteCategory = 'strategy' | 'weekly_eval' | 'monthly_plan' | 'other'

export interface Note {
  id: string
  title: string
  category: NoteCategory
  relatedDate: string // 'YYYY-MM-DD'
  createdAt: string
  content: string
}

export const NOTE_CATEGORIES: Record<NoteCategory, { label: string; color: string; bgBadge: string }> = {
  strategy:     { label: 'Ide Strategi',      color: '#D4A94C', bgBadge: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  weekly_eval:  { label: 'Evaluasi Mingguan', color: '#3B82F6', bgBadge: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  monthly_plan: { label: 'Rencana Bulanan',   color: '#8B5CF6', bgBadge: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  other:        { label: 'Lainnya',           color: '#64748B', bgBadge: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
}

const STORAGE_KEY = 'trading_journal_notes_v1'

const initialNotes: Note[] = [
  {
    id: '1',
    title: 'Ide Strategi Breakout + EMA',
    category: 'strategy',
    relatedDate: '2026-05-24',
    createdAt: '24 Mei 2026',
    content: 'Coba kombinasikan SMC + EMA untuk konfirmasi trend H4. Gunakan FVG sebagai area POI utama.',
  },
  {
    id: '2',
    title: 'Evaluasi Minggu Ke-3 Mei',
    category: 'weekly_eval',
    relatedDate: '2026-05-19',
    createdAt: '19 Mei 2026',
    content: 'Minggu ini win rate meningkat, tapi masih sering cut loss terlalu cepat karena panik.',
  },
  {
    id: '3',
    title: 'Rencana Trading Bulan Juni',
    category: 'monthly_plan',
    relatedDate: '2026-05-18',
    createdAt: '18 Mei 2026',
    content: 'Fokus pada 2 pair utama (EURUSD & XAUUSD) dan tingkatkan disiplin risk management 1% per trade.',
  },
]

export function getStoredNotes(): Note[] {
  if (typeof window === 'undefined') return initialNotes
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // Ignore localStorage errors
  }
  return initialNotes
}

export function saveStoredNotes(notes: Note[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch {
    // Ignore localStorage errors
  }
}

export function getNotesForDate(dateStr: string): Note[] {
  const notes = getStoredNotes()
  return notes.filter((n) => n.relatedDate === dateStr)
}
