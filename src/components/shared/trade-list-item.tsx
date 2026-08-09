'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Link2
} from 'lucide-react'
import { Trade } from '@/types/trade'
import { analyzeTradeExit } from '@/utils/trade-metrics'
import { cn } from '@/lib/utils'

export interface TradeListItemProps {
  trade: Trade
  isMultiSelectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (trade: Trade) => void
  onSelect?: (trade: Trade) => void
  onOpenGroup?: (groupId: string) => void
}

const moodEmojis: Record<string, { label: string; emoji: string }> = {
  confident: { label: 'Confident', emoji: '😊' },
  neutral:   { label: 'Neutral',   emoji: '😐' },
  fomo:      { label: 'FOMO',      emoji: '😤' },
  anxious:   { label: 'Cemas',     emoji: '😰' },
  greedy:    { label: 'Serakah',   emoji: '🤑' },
}

export function TradeListItem({
  trade,
  isMultiSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onSelect,
  onOpenGroup,
}: TradeListItemProps) {
  const isBuy = trade.direction === 'buy'
  const isProfit = (trade.pnl || 0) > 0
  const isLoss = trade.status === 'closed' && (trade.pnl || 0) < 0
  const isBreakeven = trade.status === 'closed' && trade.pnl === 0
  const isComplete = trade.journalStatus === 'complete'
  const isOpen = trade.status === 'open'
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
      {/* Left: Checkbox (in multi-select), Direction Icon, Symbol, & Badges */}
      <div className="flex items-center gap-3">
        {/* Multi-Select Checkbox */}
        {isMultiSelectMode && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center pr-1 shrink-0"
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect?.(trade)}
              className="h-4 w-4 rounded border-border text-primary cursor-pointer accent-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Direction Icon (Neutral Colors: Blue for Buy, Amber for Sell - NOT Red/Green) */}
        <div
          className={cn(
            'h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors',
            isBuy
              ? 'bg-blue-500/10 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-500/30'
              : 'bg-amber-500/10 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-500/30'
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
            {/* Position Direction Badge (Neutral colors) */}
            <span
              className={cn(
                'text-[10px] font-bold uppercase px-1.5 py-0.5 rounded',
                isBuy
                  ? 'bg-blue-500/15 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'bg-amber-500/15 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
              )}
            >
              {trade.direction}
            </span>
            <span className="text-xs text-muted-foreground font-mono font-semibold">
              {trade.volume} Lot
            </span>

            {/* Solid WIN / LOSS / BE Badge */}
            {!isOpen && trade.pnl !== undefined && (
              <span
                className={cn(
                  'text-[10px] font-black uppercase px-1.5 py-0.5 rounded text-white tracking-wider shadow-xs shrink-0',
                  trade.pnl > 0
                    ? 'bg-emerald-600'
                    : trade.pnl < 0
                    ? 'bg-red-600'
                    : 'bg-slate-600 dark:bg-slate-700'
                )}
              >
                {trade.pnl > 0 ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BE'}
              </span>
            )}

            {/* Strategy Badges */}
            {trade.strategies && trade.strategies.length > 0 && (
              trade.strategies.map((strat) => (
                <span
                  key={strat.id}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1"
                  style={{
                    backgroundColor: `${strat.color}20`,
                    borderColor: `${strat.color}60`,
                    color: strat.color,
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: strat.color }} />
                  <span>{strat.name}</span>
                </span>
              ))
            )}

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

            {/* Grouped Badge (if belongs to a batch group) */}
            {(trade.groupId || trade.groupName) && (
              <button
                type="button"
                onClick={(e) => {
                  if (onOpenGroup && trade.groupId) {
                    e.stopPropagation()
                    onOpenGroup(trade.groupId)
                  }
                }}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition-all cursor-pointer"
                title="Klik untuk melihat / mengedit jurnal kelompok ini"
              >
                <Link2 className="h-3 w-3 text-purple-400" />
                <span>{trade.groupName || 'Grouped'}</span>
              </button>
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
      <div className="text-right flex flex-col items-end gap-1 shrink-0">
        <div className="flex items-center gap-1.5">
          {isOpen && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
          {/* Win/Loss Colors Reserved for PnL */}
          <span
            className={cn(
              'font-mono font-bold text-sm sm:text-base',
              isOpen
                ? 'text-primary'
                : isProfit
                ? 'text-emerald-700 dark:text-emerald-400'
                : isLoss
                ? 'text-red-700 dark:text-red-400'
                : 'text-muted-foreground'
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

  // Left Border Accent & Background Tint (Win/Loss/BE Reserved Colors)
  const cardClasses = cn(
    'block bg-card border border-l-4 rounded-2xl p-4 transition-all hover:shadow-md active:scale-[0.99] group relative overflow-hidden cursor-pointer select-none',
    // Selection highlight
    isSelected && 'ring-2 ring-primary border-primary/50 bg-primary/10',
    // Left Border Accent (3-4px) & Background Tint
    isOpen
      ? 'border-l-blue-400 bg-blue-500/[0.03]'
      : isProfit
      ? 'border-l-emerald-500 bg-emerald-500/[0.04] dark:bg-emerald-950/20'
      : isLoss
      ? 'border-l-red-500 bg-red-500/[0.04] dark:bg-red-950/20'
      : 'border-l-slate-500 bg-slate-500/[0.03]',
    // Warning state if incomplete
    !isComplete && !isSelected && 'border-amber-400/80 dark:border-amber-500/50'
  )

  const handleClick = () => {
    if (isMultiSelectMode) {
      onToggleSelect?.(trade)
    } else if (onSelect) {
      onSelect(trade)
    }
  }

  return (
    <div onClick={handleClick} className={cardClasses}>
      {content}
    </div>
  )
}
