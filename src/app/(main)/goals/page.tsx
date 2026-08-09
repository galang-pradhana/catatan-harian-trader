'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function GoalsPageRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/compounding?tab=behavior')
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
      <Loader2 className="h-6 w-6 text-primary animate-spin" />
      <p className="text-xs text-muted-foreground font-mono">
        Mengalihkan menu Tujuan ke Compounding (Tab Target Perilaku)...
      </p>
    </div>
  )
}
