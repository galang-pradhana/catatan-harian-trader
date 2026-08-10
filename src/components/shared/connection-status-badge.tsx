import React from 'react'
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MT5Status = 'connected' | 'pending' | 'error'

export interface ConnectionStatusBadgeProps {
  status: MT5Status
  errorMessage?: string
  lastSyncedAt?: string
  className?: string
}

export function ConnectionStatusBadge({
  status,
  errorMessage,
  lastSyncedAt,
  className,
}: ConnectionStatusBadgeProps) {
  const config = {
    connected: {
      label: 'Terhubung',
      bg: 'bg-profit/15 text-profit border-profit/30',
      icon: CheckCircle2,
    },
    pending: {
      label: 'Menunggu Koneksi',
      bg: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
      icon: Clock,
    },
    error: {
      label: 'Error',
      bg: 'bg-destructive/15 text-destructive border-destructive/30',
      icon: AlertTriangle,
    },
  }[status]

  const Icon = config.icon

  return (
    <div className="flex flex-col items-end text-right gap-1 shrink-0">
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0',
          config.bg,
          className
        )}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{config.label}</span>
      </div>
      {status === 'connected' && lastSyncedAt && (
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          Terakhir sync: {lastSyncedAt}
        </span>
      )}
      {status === 'error' && errorMessage && (
        <span className="text-[10px] text-destructive font-medium">
          {errorMessage}
        </span>
      )}
    </div>
  )
}
