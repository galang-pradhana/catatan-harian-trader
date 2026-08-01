'use client'

import React, { useEffect } from 'react'
import { create } from 'zustand'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

interface ToastStore {
  toasts: ToastMessage[]
  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    set((state) => ({
      toasts: [...state.toasts, { id, type, message }],
    }))
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }))
    }, 3500)
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))

export function toast(message: string, type: ToastType = 'info') {
  useToastStore.getState().addToast(message, type)
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-bottom-5 duration-200',
            t.type === 'success' && 'bg-card text-foreground border-profit/50 dark:border-profit/40',
            t.type === 'error' && 'bg-card text-foreground border-destructive/50 dark:border-destructive/40',
            t.type === 'info' && 'bg-card text-foreground border-border'
          )}
        >
          <div className="flex items-center gap-2.5">
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 text-profit shrink-0" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-primary shrink-0" />}
            <span>{t.message}</span>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
