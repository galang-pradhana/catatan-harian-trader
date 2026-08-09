'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  Tag,
  Filter,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Note,
  NoteCategory,
  NOTE_CATEGORIES,
  getStoredNotes,
  saveStoredNotes,
} from '@/utils/notes-storage'

function NotesContent() {
  const searchParams = useSearchParams()
  const dateParam = searchParams.get('date')

  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNoteId, setSelectedNoteId] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all')

  // Load notes on mount
  useEffect(() => {
    const loaded = getStoredNotes()
    setNotes(loaded)
    if (loaded.length > 0) {
      if (dateParam) {
        const matched = loaded.find((n) => n.relatedDate === dateParam)
        if (matched) {
          setSelectedNoteId(matched.id)
        } else {
          setSelectedNoteId(loaded[0].id)
        }
      } else {
        setSelectedNoteId(loaded[0].id)
      }
    }
  }, [dateParam])

  // Save to storage whenever notes state changes
  const updateNotesState = (nextNotes: Note[]) => {
    setNotes(nextNotes)
    saveStoredNotes(nextNotes)
  }

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || notes[0],
    [notes, selectedNoteId]
  )

  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState<NoteCategory>('strategy')
  const [editRelatedDate, setEditRelatedDate] = useState('')
  const [editContent, setEditContent] = useState('')

  // Sync form inputs when selectedNote changes
  useEffect(() => {
    if (selectedNote) {
      setEditTitle(selectedNote.title || '')
      setEditCategory(selectedNote.category || 'strategy')
      setEditRelatedDate(selectedNote.relatedDate || new Date().toISOString().slice(0, 10))
      setEditContent(selectedNote.content || '')
    }
  }, [selectedNote])

  const handleSelectNote = (n: Note) => {
    setSelectedNoteId(n.id)
  }

  const handleCreateNewNote = () => {
    const newId = String(Date.now())
    const todayIso = new Date().toISOString().slice(0, 10)
    const newNote: Note = {
      id: newId,
      title: 'Catatan Baru',
      category: 'strategy',
      relatedDate: dateParam || todayIso,
      createdAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      content: '',
    }
    const next = [newNote, ...notes]
    updateNotesState(next)
    setSelectedNoteId(newId)
  }

  const handleSaveNote = () => {
    if (!selectedNoteId) return
    const next = notes.map((n) =>
      n.id === selectedNoteId
        ? {
            ...n,
            title: editTitle,
            category: editCategory,
            relatedDate: editRelatedDate,
            content: editContent,
          }
        : n
    )
    updateNotesState(next)
  }

  const handleDeleteNote = (id: string) => {
    const filtered = notes.filter((n) => n.id !== id)
    updateNotesState(filtered)
    if (filtered.length > 0) {
      setSelectedNoteId(filtered[0].id)
    }
  }

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase())
      const matchCategory = activeCategoryFilter === 'all' || n.category === activeCategoryFilter
      const matchDate = !dateParam || n.relatedDate === dateParam
      return matchSearch && matchCategory && matchDate
    })
  }, [notes, searchQuery, activeCategoryFilter, dateParam])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-extrabold text-foreground">Catatan Trading Libre</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Jurnal bebas untuk mencatat rencana trading, ide strategi, dan evaluasi berkategori.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleCreateNewNote}>
          <Plus className="h-4 w-4 mr-1.5" /> Catatan Baru
        </Button>
      </div>

      {/* Date Filter Alert Banner if opened via URL param */}
      {dateParam && (
        <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between gap-3 text-xs font-bold">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Memfilter catatan terkait tanggal: <strong className="font-mono text-primary">{dateParam}</strong></span>
          </div>
          <a href="/notes" className="text-[11px] font-bold text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Tampilkan Semua Tanggal
          </a>
        </div>
      )}

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap border-b border-border pb-3">
        <span className="text-xs font-bold text-muted-foreground mr-1 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-primary" /> Kategori:
        </span>
        <button
          type="button"
          onClick={() => setActiveCategoryFilter('all')}
          className={cn(
            'px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeCategoryFilter === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          )}
        >
          Semua ({notes.length})
        </button>

        {(Object.keys(NOTE_CATEGORIES) as NoteCategory[]).map((catKey) => {
          const catDef = NOTE_CATEGORIES[catKey]
          const count = notes.filter((n) => n.category === catKey).length
          const isActive = activeCategoryFilter === catKey
          return (
            <button
              key={catKey}
              type="button"
              onClick={() => setActiveCategoryFilter(catKey)}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: catDef.color }} />
              <span>{catDef.label}</span>
              <span className="opacity-70 font-mono text-[10px]">({count})</span>
            </button>
          )
        })}
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[520px]">
        {/* Left Column: List of Notes (1/3 width) */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm space-y-3 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari judul / isi catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[38px]"
            />
          </div>

          <div className="space-y-2 flex-1 max-h-[460px] overflow-y-auto pr-1">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((n) => {
                const isSelected = n.id === selectedNoteId
                const catDef = NOTE_CATEGORIES[n.category || 'other']

                return (
                  <div
                    key={n.id}
                    onClick={() => handleSelectNote(n)}
                    className={cn(
                      'p-3.5 rounded-xl border transition-all cursor-pointer select-none space-y-2',
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-card border-border/60 hover:bg-muted/30 hover:border-border'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-[9px] font-bold uppercase px-2 py-0.5 rounded border', catDef.bgBadge)}>
                        {catDef.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono font-semibold">
                        📅 {n.relatedDate}
                      </span>
                    </div>

                    <h4 className={cn('text-xs font-extrabold truncate', isSelected ? 'text-primary' : 'text-foreground')}>
                      {n.title || 'Tanpa Judul'}
                    </h4>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {n.content || 'Catatan kosong...'}
                    </p>
                  </div>
                )
              })
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">
                Tidak ada catatan ditemukan.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Note Editor (2/3 width) */}
        {selectedNote ? (
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
            {/* Editor Header Toolbar & Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                {/* Category Picker Selector */}
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as NoteCategory)}
                    className="bg-background border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {(Object.keys(NOTE_CATEGORIES) as NoteCategory[]).map((catKey) => (
                      <option key={catKey} value={catKey}>
                        {NOTE_CATEGORIES[catKey].label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Related Date Input */}
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary ml-2" />
                  <input
                    type="date"
                    value={editRelatedDate}
                    onChange={(e) => setEditRelatedDate(e.target.value)}
                    className="bg-background border border-border rounded-lg px-2 py-1 text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="text-destructive hover:bg-destructive/10 cursor-pointer"
                  title="Hapus Catatan"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveNote} className="font-bold text-xs">
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
              className="text-lg font-extrabold bg-transparent text-foreground placeholder:text-muted-foreground border-b border-border/40 pb-2 focus:outline-none focus:border-primary w-full"
            />

            {/* Note Content Textarea */}
            <textarea
              rows={14}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Tuliskan ide strategi, rencana bulanan, atau evaluasi mingguan Anda di sini..."
              className="flex-1 w-full bg-background/50 border border-border rounded-xl p-4 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y leading-relaxed font-sans"
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

export default function NotesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      }
    >
      <NotesContent />
    </Suspense>
  )
}
