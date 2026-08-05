'use client'

import React, { useState, useRef, useEffect } from 'react'
import { HelpCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatTooltipProps {
  title: string
  definition: string
  interpretation: string
  formula?: string
  className?: string
  align?: 'left' | 'right' | 'center'
}

export function StatTooltip({
  title,
  definition,
  interpretation,
  formula,
  className,
  align = 'right'
}: StatTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative inline-flex items-center ml-1.5', className)} ref={tooltipRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus:outline-none"
        aria-label={`Penjelasan metrik ${title}`}
        title={`Petunjuk ${title}`}
      >
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/80 hover:text-primary transition-colors" />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute bottom-full mb-2 z-50 w-72 sm:w-80 bg-popover border border-border text-popover-foreground rounded-2xl p-4 shadow-xl text-xs space-y-2.5 backdrop-blur-md animate-in fade-in zoom-in-95',
            align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border/80 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <span>{title}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2 leading-relaxed">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Definisi
              </span>
              <p className="text-foreground font-medium">{definition}</p>
            </div>

            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                Cara Membaca / Interpretasi
              </span>
              <p className="text-primary font-semibold">{interpretation}</p>
            </div>

            {formula && (
              <div className="pt-1 border-t border-border/60">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Rumus Perhitungan
                </span>
                <code className="text-[11px] font-mono bg-muted/60 text-foreground px-2 py-1 rounded-md block mt-0.5 border border-border/40">
                  {formula}
                </code>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
