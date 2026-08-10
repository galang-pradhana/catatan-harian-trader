'use client'

import React, { useState, useEffect } from 'react'
import { Menu, AlertCircle } from 'lucide-react'
import { MobileNavDrawer } from './mobile-nav-drawer'
import { cn } from '@/lib/utils'

export interface MobileStickyHeaderProps {
  title: string
  description?: string
  incompleteCount?: number
  onIncompleteClick?: () => void
  rightActions?: React.ReactNode
  showHamburger?: boolean
  children?: React.ReactNode
  className?: string
}

export function MobileStickyHeader({
  title,
  description,
  incompleteCount = 0,
  onIncompleteClick,
  rightActions,
  showHamburger = false,
  children,
  className,
}: MobileStickyHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isNavDrawerOpen, setIsNavDrawerOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      {showHamburger && (
        <MobileNavDrawer
          isOpen={isNavDrawerOpen}
          onClose={() => setIsNavDrawerOpen(false)}
        />
      )}

      {/* Responsive Page Header Container */}
      <div
        className={cn(
          'transition-all duration-200 border-b border-border/80',
          isScrolled
            ? 'sticky top-[53px] md:top-0 z-20 bg-background/95 backdrop-blur-md py-2 px-2 sm:px-4 shadow-2xs'
            : 'pt-1 pb-3',
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left Side: Optional Hamburger + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            {showHamburger && (
              <button
                type="button"
                onClick={() => setIsNavDrawerOpen(true)}
                className="md:hidden p-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
                aria-label="Buka Menu Navigasi"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </button>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className={cn(
                    'font-extrabold text-foreground tracking-tight transition-all truncate',
                    isScrolled ? 'text-sm sm:text-base' : 'text-lg sm:text-xl md:text-2xl'
                  )}
                >
                  {title}
                </h1>

                {/* Incomplete Badge */}
                {incompleteCount > 0 && (
                  <button
                    type="button"
                    onClick={onIncompleteClick}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] sm:text-[11px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer shrink-0 shadow-2xs"
                    title="Klik untuk filter trade yang belum diisi"
                  >
                    <AlertCircle className="h-3 w-3" />
                    <span>{incompleteCount} Belum Diisi</span>
                  </button>
                )}
              </div>

              {!isScrolled && description && (
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block truncate">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* Right Side Actions */}
          {rightActions && (
            <div className="flex items-center gap-2 shrink-0">
              {rightActions}
            </div>
          )}
        </div>

        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </>
  )
}
