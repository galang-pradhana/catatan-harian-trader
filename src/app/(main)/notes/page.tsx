'use client'

import React, { useState } from 'react'
import {
  FileText,
  Plus,
  Save,
  Trash2,
  Calendar,
  Search,
  Bold,
  Italic,
  List,
  Heading,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Note {
  id: string
  title: string
  date: string
  content: string
}

const initialNotes: Note[] = [
  {
    id: '1',
    title: 'Ide Strategi Baru',
    date: '24 Mei 2026',
    content: 'Coba kombinasikan SMC + EMA untuk konfirmasi trend H4. Gunakan FVG sebagai area POI utama.',
  },
  {
    id: '2',
    title: 'Evaluasi Mingguan',
    date: '19 Mei 2026',
    content: 'Minggu ini win rate meningkat, tapi masih sering cut loss terlalu cepat karena panik.',
  },
  {
    id: '3',
    title: 'Rencana Trading Bulan Juni',
    date: '18 Mei 2026',
    content: 'Fokus pada 2 pair utama (EURUSD & XAUUSD) dan tingkatkan disiplin risk management 1% per trade.',
  },
]

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [selectedNoteId, setSelectedNoteId] = useState<string>('1')
  const [searchQuery, setSearchQuery] = useState('')

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0]

  const [editTitle, setEditTitle] = useState(selectedNote?.title || '')
  const [editContent, setEditContent] = useState(selectedNote?.content || '')

  const handleSelectNote = (n: Note) => {
    setSelectedNoteId(n.id)
    setEditTitle(n.title)
    setEditContent(n.content)
  }

  const handleCreateNewNote = () => {
    const newId = String(Date.now())
    const newNote: Note = {
      id: newId,
      title: 'Catatan Baru',
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      content: '',
    }
    setNotes([newNote, ...notes])
    setSelectedNoteId(newId)
    setEditTitle(newNote.title)
    setEditContent(newNote.content)
  }

  const handleSaveNote = () => {
    setNotes((prev) =>
      prev.map((n) => (n.id === selectedNoteId ? { ...n, title: editTitle, content: editContent } : n))
    )
  }

  const handleDeleteNote = (id: string) => {
    const filtered = notes.filter((n) => n.id !== id)
    setNotes(filtered)
    if (filtered.length > 0) {
      handleSelectNote(filtered[0])
    }
  }

  const filteredNotes = notes.filter(
    (n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Catatan Trading Libre
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Jurnal bebas untuk mencatat rencana trading, ide strategi, dan evaluasi pribadi.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleCreateNewNote}>
          <Plus className="h-4 w-4 mr-1.5" /> Catatan Baru
        </Button>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Left Column: List of Notes (1/3 width) */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[38px]"
            />
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredNotes.map((n) => {
              const isSelected = n.id === selectedNoteId
              return (
                <div
                  key={n.id}
                  onClick={() => handleSelectNote(n)}
                  className={cn(
                    'p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-1',
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-card border-border/60 hover:bg-muted/30 hover:border-border'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h4 className={cn('text-xs font-bold truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                      {n.title || 'Tanpa Judul'}
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-mono">{n.date}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {n.content || 'Kosong...'}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Note Editor (2/3 width) */}
        {selectedNote ? (
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
            {/* Editor Toolbar & Action */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Bold className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Italic className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><List className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><Heading className="h-4 w-4" /></Button>
                <span className="text-border mx-1">|</span>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                  <Calendar className="h-3.5 w-3.5" /> {selectedNote.date}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(selectedNote.id)} className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveNote}>
                  <Save className="h-4 w-4 mr-1.5" /> Simpan Catatan
                </Button>
              </div>
            </div>

            {/* Note Title Input */}
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Judul Catatan..."
              className="text-lg font-bold bg-transparent text-foreground placeholder:text-muted-foreground border-none focus:outline-none w-full"
            />

            {/* Note Content Textarea */}
            <textarea
              rows={12}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Tuliskan catatan ide trading, riset pasar, atau evaluasi di sini..."
              className="flex-1 w-full bg-background/50 border border-border rounded-xl p-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y leading-relaxed"
            />
          </div>
        ) : (
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3">
            <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
            <p className="text-xs text-muted-foreground">Pilih catatan atau buat catatan baru di panel kiri.</p>
          </div>
        )}
      </div>
    </div>
  )
}
