import React from 'react'
import { Sidebar } from '@/components/shared/sidebar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pb-8 p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full min-w-0">
        {children}
      </main>
    </div>
  )
}

