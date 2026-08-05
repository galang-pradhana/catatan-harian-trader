'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  MoreVertical,
  Star,
  Edit3,
  Copy,
  Archive,
  Trash2,
  Check,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CompoundingQuickActionsProps {
  planId: string
  planName: string
  isActive: boolean
  isArchived: boolean
  onSetActive?: () => void
  onEdit?: () => void
  onDuplicate?: () => void
  onToggleArchive?: () => void
  onDelete?: () => void
}

export function CompoundingQuickActions({
  planId,
  planName,
  isActive,
  isArchived,
  onSetActive,
  onEdit,
  onDuplicate,
  onToggleArchive,
  onDelete
}: CompoundingQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 rounded-xl bg-card/80 border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
        title="Aksi Cepat"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-30 w-52 bg-card border border-border/80 rounded-2xl shadow-xl p-1.5 space-y-1 backdrop-blur-md text-xs">
          {!isActive && (
            <button
              type="button"
              onClick={() => { setIsOpen(false); onSetActive?.() }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left font-bold text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
            >
              <Star className="h-4 w-4 shrink-0" />
              <span>Jadikan Plan Aktif</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => { setIsOpen(false); onEdit?.() }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Edit3 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Edit Plan & Rules</span>
          </button>

          <button
            type="button"
            onClick={() => { setIsOpen(false); onDuplicate?.() }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>Duplikasi Plan</span>
          </button>

          <button
            type="button"
            onClick={() => { setIsOpen(false); onToggleArchive?.() }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <Archive className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{isArchived ? 'Buka Arsip' : 'Arsipkan Plan'}</span>
          </button>

          <div className="h-px bg-border/60 my-1" />

          <button
            type="button"
            onClick={() => { setIsOpen(false); onDelete?.() }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left font-bold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>Hapus Plan</span>
          </button>
        </div>
      )}
    </div>
  )
}
