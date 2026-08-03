'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import React from 'react'

function CalendarRedirectContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', 'calendar')
    router.replace(`/trades?${params.toString()}`)
  }, [router, searchParams])

  return null
}

export default function CalendarRedirectPage() {
  return (
    <React.Suspense fallback={null}>
      <CalendarRedirectContent />
    </React.Suspense>
  )
}
