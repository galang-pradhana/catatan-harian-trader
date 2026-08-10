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
  children?: React.ReactNode
  className?: string
}

export function MobileStickyHeader({
  title,
  description,
  incompleteCount = 0,
  onIncompleteClick,
  rightActions,
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
      {/* Mobile Navigation Slide-Over Drawer */}
      <MobileNavDrawer
        isOpen={isNavDrawerOpen}
        onClose={() => setIsNavDrawerOpen(false)}
      />

      {/* Responsive Header Container */}
      <div
        className={cn(
          'transition-all duration-200 border-b border-border/80',
          isScrolled
            ? 'sticky top-0 z-30 bg-background/95 backdrop-blur-md py-2.5 px-3 -mx-2 sm:-mx-4 sm:px-4 shadow-sm'
            : 'pt-1 pb-4',
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left Side: Hamburger Menu Button (Garis 3) + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* 1 Hamburger Menu Button (Garis 3) for Mobile */}
            <button
              type="button"
              onClick={() => setIsNavDrawerOpen(true)}
              className="md:hidden p-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
              aria-label="Buka Menu Navigasi"
              title="Buka Navigasi App"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className={cn(
                    'font-extrabold text-foreground tracking-tight transition-all truncate',
                    isScrolled ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'
                  )}
                >
                  {title}
                </h1>

                {/* Incomplete Badge (if any) */}
                {incompleteCount > 0 && (
                  <button
                    type="button"
                    onClick={onIncompleteClick}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer shrink-0 shadow-2xs"
                    title="Klik untuk filter trade yang belum diisi"
                  >
                    <AlertCircle className="h-3 w-3" />
                    <span>{incompleteCount} Belum Diisi</span>
                  </button>
                )}
              </div>

              {/* Description (Visible only when not scrolled) */}
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

        {/* Extra children rendered inside header (e.g. view switcher if passed) */}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </>
  )
}
