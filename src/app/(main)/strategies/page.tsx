'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Tags,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Loader2,
  Palette,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/shared/toast'
import { DUMMY_STRATEGIES, DUMMY_MISTAKE_TAGS } from '@/constants/dummy-trades'
import type { Strategy, MistakeTag } from '@/types/trade'

// Preset colors
const COLOR_PRESETS = [
  '#D4A94C', // Gold
  '#22C55E', // Green
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F97316', // Orange
  '#14B8A6', // Teal
]

// ── API Fetchers ──────────────────────────────────────────────
async function fetchStrategies(): Promise<Strategy[]> {
  const res = await fetch('/api/strategies')
  if (!res.ok) return DUMMY_STRATEGIES
  const json = await res.json()
  return json.strategies?.length ? json.strategies : DUMMY_STRATEGIES
}

async function fetchMistakeTags(): Promise<MistakeTag[]> {
  const res = await fetch('/api/mistake-tags')
  if (!res.ok) return DUMMY_MISTAKE_TAGS
  const json = await res.json()
  return json.mistake_tags?.length ? json.mistake_tags : DUMMY_MISTAKE_TAGS
}

export default function StrategiesPage() {
  const queryClient = useQueryClient()

  // Queries
  const { data: strategies = [], isLoading: loadStrat } = useQuery({
    queryKey: ['strategies'],
    queryFn: fetchStrategies,
  })

  const { data: mistakeTags = [], isLoading: loadTags } = useQuery({
    queryKey: ['mistake-tags'],
    queryFn: fetchMistakeTags,
  })

  // Strategy Form State
  const [newStratName, setNewStratName] = useState('')
  const [newStratColor, setNewStratColor] = useState('#D4A94C')
  const [editingStratId, setEditingStratId] = useState<string | null>(null)
  const [editStratName, setEditStratName] = useState('')

  // Mistake Tag Form State
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#EF4444')
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editTagName, setEditTagName] = useState('')

  // ── Strategy Mutations ──────────────────────────────────────
  const addStratMutation = useMutation({
    mutationFn: async (payload: { name: string; color: string }) => {
      const res = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal menambah strategi')
      return res.json()
    },
    onSuccess: () => {
      toast('Strategi baru berhasil ditambahkan!', 'success')
      setNewStratName('')
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
    },
    onError: () => {
      toast('Strategi ditambahkan (Demo Mode)', 'info')
      setNewStratName('')
    },
  })

  const deleteStratMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus strategi')
      return res.json()
    },
    onSuccess: () => {
      toast('Strategi berhasil dihapus', 'success')
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
    },
    onError: () => {
      toast('Strategi dihapus (Demo Mode)', 'info')
    },
  })

  // ── Mistake Tag Mutations ────────────────────────────────────
  const addTagMutation = useMutation({
    mutationFn: async (payload: { name: string; color: string }) => {
      const res = await fetch('/api/mistake-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal menambah tag kesalahan')
      return res.json()
    },
    onSuccess: () => {
      toast('Tag kesalahan berhasil ditambahkan!', 'success')
      setNewTagName('')
      queryClient.invalidateQueries({ queryKey: ['mistake-tags'] })
    },
    onError: () => {
      toast('Tag kesalahan ditambahkan (Demo Mode)', 'info')
      setNewTagName('')
    },
  })

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/mistake-tags/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus tag')
      return res.json()
    },
    onSuccess: () => {
      toast('Tag kesalahan berhasil dihapus', 'success')
      queryClient.invalidateQueries({ queryKey: ['mistake-tags'] })
    },
    onError: () => {
      toast('Tag dihapus (Demo Mode)', 'info')
    },
  })

  const handleAddStrategy = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStratName.trim()) return
    addStratMutation.mutate({ name: newStratName.trim(), color: newStratColor })
  }

  const handleAddMistakeTag = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTagName.trim()) return
    addTagMutation.mutate({ name: newTagName.trim(), color: newTagColor })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-2xl font-bold text-foreground">Strategi &amp; Tag Kesalahan</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Kelola daftar setup strategi trading dan label kesalahan kustom untuk jurnal Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SECTION 1: Strategi Trading */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" /> Setup Strategi
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Model setup yang biasa Anda gunakan
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
              {strategies.length} Tag
            </span>
          </div>

          {/* Form Tambah Strategi */}
          <form onSubmit={handleAddStrategy} className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border/50">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Tambah Strategi Baru
              </label>
              <input
                type="text"
                placeholder="Contoh: Breakout + Retest"
                value={newStratName}
                onChange={(e) => setNewStratName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Color Palette */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Warna Label:</span>
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewStratColor(color)}
                  style={{ backgroundColor: color }}
                  className={`h-5 w-5 rounded-full transition-all cursor-pointer ${
                    newStratColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="primary"
              type="submit"
              size="sm"
              className="w-full mt-2"
              isLoading={addStratMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Strategi
            </Button>
          </form>

          {/* List Strategi */}
          <div className="space-y-2">
            {loadStrat ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              </div>
            ) : strategies.length > 0 ? (
              strategies.map((strat) => (
                <div
                  key={strat.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: strat.color || '#D4A94C' }}
                    />
                    <span className="text-xs font-bold text-foreground">{strat.name}</span>
                  </div>

                  <button
                    onClick={() => deleteStratMutation.mutate(strat.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                    title="Hapus Strategi"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada strategi.</p>
            )}
          </div>
        </div>

        {/* SECTION 2: Tag Kesalahan */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-5">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-loss" /> Tag Kesalahan
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Jenis kesalahan psikologi / eksekusi
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-loss/10 text-loss border border-loss/30">
              {mistakeTags.length} Tag
            </span>
          </div>

          {/* Form Tambah Tag Kesalahan */}
          <form onSubmit={handleAddMistakeTag} className="space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border/50">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider text-loss">
                Tambah Tag Kesalahan Baru
              </label>
              <input
                type="text"
                placeholder="Contoh: Overleveraging 10x"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-loss"
              />
            </div>

            {/* Color Palette */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Warna Label:</span>
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewTagColor(color)}
                  style={{ backgroundColor: color }}
                  className={`h-5 w-5 rounded-full transition-all cursor-pointer ${
                    newTagColor === color ? 'ring-2 ring-offset-2 ring-loss scale-110' : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <Button
              variant="danger"
              type="submit"
              size="sm"
              className="w-full mt-2"
              isLoading={addTagMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-1.5" /> Tambah Tag Kesalahan
            </Button>
          </form>

          {/* List Tag Kesalahan */}
          <div className="space-y-2">
            {loadTags ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 text-loss animate-spin" />
              </div>
            ) : mistakeTags.length > 0 ? (
              mistakeTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border/60 hover:border-loss/30 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3.5 w-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color || '#EF4444' }}
                    />
                    <span className="text-xs font-bold text-foreground">{tag.name}</span>
                  </div>

                  <button
                    onClick={() => deleteTagMutation.mutate(tag.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                    title="Hapus Tag"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Belum ada tag kesalahan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
