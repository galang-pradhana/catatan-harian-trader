'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from './sidebar'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[11px] font-medium transition-colors min-h-[44px]',
              isActive
                ? 'text-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className={cn('h-5 w-5 mb-0.5', isActive && 'text-primary')} />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
