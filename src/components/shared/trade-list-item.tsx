'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Trade } from '@/types/trade'
import { analyzeTradeExit } from '@/utils/trade-metrics'
import { cn } from '@/lib/utils'

export interface TradeListItemProps {
  trade: Trade
}

const moodEmojis: Record<string, { label: string; emoji: string }> = {
  confident: { label: 'Confident', emoji: '😊' },
  neutral:   { label: 'Neutral',   emoji: '😐' },
  fomo:      { label: 'FOMO',      emoji: '😤' },
  anxious:   { label: 'Cemas',     emoji: '😰' },
  greedy:    { label: 'Serakah',   emoji: '🤑' },
}

export function TradeListItem({ trade }: TradeListItemProps) {
  const isBuy = trade.direction === 'buy'
  const isProfit = (trade.pnl || 0) >= 0
  const isComplete = trade.journalStatus === 'complete'
  const isOpen = trade.status === 'open'
  const isLoss = trade.status === 'closed' && (trade.pnl || 0) < 0

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

  return (
    <Link
      href={`/trades/${trade.id}`}
      className={cn(
        'block bg-card border rounded-2xl p-4 transition-all hover:shadow-md active:scale-[0.99] group relative overflow-hidden',
        isOpen
          ? 'border-primary/40 bg-primary/5'
          : !isComplete
          ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
          : isLoss
          ? 'border-border border-l-4 border-l-destructive/80'
          : 'border-border hover:border-primary/40'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Symbol, Direction, & Discipline/Mood Badges */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
              isBuy
                ? 'bg-profit/15 text-profit border border-profit/30'
                : 'bg-loss/15 text-loss border border-loss/30'
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
                  isBuy ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss'
                )}
              >
                {trade.direction}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {trade.volume} Lot
              </span>

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

              {/* Discipline Badge (Requirement 4) */}
              {trade.discipline === 'no' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30">
                  <ShieldAlert className="h-3 w-3" /> Melanggar Rules
                </span>
              )}
              {trade.discipline === 'yes' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="h-3 w-3" /> Ikut Rules
                </span>
              )}

              {/* Mood Badge (Requirement 4) */}
              {moodObj && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  {moodObj.emoji} {moodObj.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
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
                  ? 'text-profit'
                  : 'text-loss'
              )}
            >
              {formattedPnl}
            </span>
          </div>

          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
              isComplete
                ? 'bg-profit/10 text-profit border-profit/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
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
    </Link>
  )
}
