import React from 'react'
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react'
import { StatComparison } from '@/types/dashboard'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  title: string
  value: string | number
  comparison?: StatComparison
  icon?: LucideIcon
  subtitle?: string
  valueColor?: 'profit' | 'loss' | 'default'
}

export function StatCard({
  title,
  value,
  comparison,
  icon: Icon,
  subtitle,
  valueColor = 'default',
}: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-3 transition-all hover:border-primary/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </span>
        {Icon && (
          <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3
          className={cn(
            'text-2xl sm:text-3xl font-mono font-extrabold tracking-tight',
            valueColor === 'profit' && 'text-profit',
            valueColor === 'loss' && 'text-loss',
            valueColor === 'default' && 'text-foreground'
          )}
        >
          {value}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {comparison && (
        <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 text-xs">
          {(() => {
            // Support both new format { value, label } and legacy { isPositive, percentageText }
            const isPos = comparison.isPositive !== undefined
              ? comparison.isPositive
              : (comparison.value ?? 0) >= 0
            const text = comparison.percentageText
              ? comparison.percentageText
              : `${(comparison.value ?? 0) >= 0 ? '+' : ''}${typeof comparison.value === 'number' ? comparison.value.toFixed(2) : comparison.value}`
            const label = comparison.label ?? 'vs. periode lalu'
            return (
              <>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded text-[11px]',
                    isPos ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
                  )}
                >
                  {isPos ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {text}
                </span>
                <span className="text-muted-foreground">{label}</span>
              </>
            )
          })()}
        </div>
      )}

    </div>
  )
}
