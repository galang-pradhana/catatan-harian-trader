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
        className="p-2 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
        title="Aksi Cepat"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-30 w-52 bg-popover border border-border rounded-2xl shadow-xl p-1.5 space-y-1 text-xs text-popover-foreground">
          {!isActive && (
            <button
              type="button"
              onClick={() => { setIsOpen(false); onSetActive?.() }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left font-bold text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
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
            <span>Edit Plan &amp; Rules</span>
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

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            onClick={() => { setIsOpen(false); onDelete?.() }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-left font-bold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>Hapus Plan</span>
          </button>
        </div>
      )}
    </div>
  )
}
