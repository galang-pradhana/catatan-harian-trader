'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Trade } from '@/types/trade'
import { analyzeTradeExit } from '@/utils/trade-metrics'
import { cn } from '@/lib/utils'

export interface TradeListItemProps {
  trade: Trade
  onSelect?: (trade: Trade) => void
}

const moodEmojis: Record<string, { label: string; emoji: string }> = {
  confident: { label: 'Confident', emoji: '😊' },
  neutral:   { label: 'Neutral',   emoji: '😐' },
  fomo:      { label: 'FOMO',      emoji: '😤' },
  anxious:   { label: 'Cemas',     emoji: '😰' },
  greedy:    { label: 'Serakah',   emoji: '🤑' },
}

export function TradeListItem({ trade, onSelect }: TradeListItemProps) {
  const isBuy = trade.direction === 'buy'
  const isProfit = (trade.pnl || 0) >= 0
  const isComplete = trade.journalStatus === 'complete'
  const isOpen = trade.status === 'open'
  const isLoss = trade.status === 'closed' && (trade.pnl || 0) < 0
  const isManual = trade.source === 'manual'

  const formattedPnl = trade.pnl !== undefined
    ? `${isProfit ? '+' : ''}$${trade.pnl.toFixed(2)}`
    : 'Running'

  const exitInfo = analyzeTradeExit({
    direction: trade.direction,
    open_price: trade.openPrice,
    close_price: trade.closePrice ?? null,
    sl: trade.sl ?? null,
    tp: trade.tp ?? null,
    pnl: trade.pnl ?? null,
    status: trade.status,
  })

  const moodObj = trade.mood ? moodEmojis[trade.mood] : null

  const content = (
    <div className="flex items-center justify-between gap-3">
      {/* Left: Symbol, Direction, & Discipline/Mood/Source Badges */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
            isBuy
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
              : 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40'
          )}
        >
          {isBuy ? (
            <ArrowUpRight className="h-5 w-5" />
          ) : (
            <ArrowDownRight className="h-5 w-5" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors">
              {trade.symbol}
            </span>
            <span
              className={cn(
                'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                isBuy
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
              )}
            >
              {trade.direction}
            </span>
            <span className="text-xs text-muted-foreground font-mono font-semibold">
              {trade.volume} Lot
            </span>

            {/* Manual Entry vs MT5 Badge */}
            {isManual ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Manual Entry
              </span>
            ) : (
              <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                MT5 Executed
              </span>
            )}

            {/* R:R Badge */}
            {exitInfo.plannedRR !== '-' && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-foreground border border-border">
                R:R {exitInfo.plannedRR}
              </span>
            )}

            {/* Exit Type Badge */}
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', exitInfo.exitBadgeColor)}>
              {exitInfo.exitTypeLabel}
            </span>

            {/* Discipline Badge */}
            {trade.discipline === 'no' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                <ShieldAlert className="h-3 w-3" /> Melanggar Rules
              </span>
            )}
            {trade.discipline === 'yes' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                <ShieldCheck className="h-3 w-3" /> Ikut Rules
              </span>
            )}

            {/* Mood Badge */}
            {moodObj && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                {moodObj.emoji} {moodObj.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
            {new Date(trade.openTime).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>

      {/* Right: PnL & Completeness Status */}
      <div className="text-right flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {isOpen && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
          <span
            className={cn(
              'font-mono font-bold text-sm sm:text-base',
              isOpen
                ? 'text-primary'
                : isProfit
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-red-700 dark:text-red-400'
            )}
          >
            {formattedPnl}
          </span>
        </div>

        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
            isComplete
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50'
              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-700/50'
          )}
        >
          {isComplete ? (
            <>
              <CheckCircle2 className="h-3 w-3 shrink-0" /> Lengkap
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3 shrink-0" /> Belum Diisi
            </>
          )}
        </span>
      </div>
    </div>
  )

  const cardClasses = cn(
    'block bg-card border rounded-2xl p-4 transition-all hover:shadow-md active:scale-[0.99] group relative overflow-hidden cursor-pointer select-none',
    isOpen
      ? 'border-primary/40 bg-primary/5'
      : !isComplete
      ? 'border-amber-400 dark:border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
      : isLoss
      ? 'border-border border-l-4 border-l-red-600 dark:border-l-red-500'
      : 'border-border hover:border-primary/40'
  )

  if (onSelect) {
    return (
      <div onClick={() => onSelect(trade)} className={cardClasses}>
        {content}
      </div>
    )
  }

  return (
    <Link href={`/trades/${trade.id}`} className={cardClasses}>
      {content}
    </Link>
  )
}

