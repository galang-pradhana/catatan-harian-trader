import React from 'react'
import { Sidebar } from '@/components/shared/sidebar'
import { BottomNav } from '@/components/shared/bottom-nav'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-8 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
