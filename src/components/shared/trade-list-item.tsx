'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle } from 'lucide-react'
import { Trade } from '@/types/trade'
import { analyzeTradeExit } from '@/utils/trade-metrics'
import { cn } from '@/lib/utils'

export interface TradeListItemProps {
  trade: Trade
}

export function TradeListItem({ trade }: TradeListItemProps) {
  const isBuy = trade.direction === 'buy'
  const isProfit = (trade.pnl || 0) >= 0
  const isComplete = trade.journalStatus === 'complete'

  const formattedPnl = trade.pnl !== undefined
    ? `${isProfit ? '+' : ''}$${trade.pnl.toFixed(2)}`
    : 'Open'

  const exitInfo = analyzeTradeExit({
    direction: trade.direction,
    open_price: trade.openPrice,
    close_price: trade.closePrice ?? null,
    sl: trade.sl ?? null,
    tp: trade.tp ?? null,
    pnl: trade.pnl ?? null,
    status: trade.status,
  })

  return (
    <Link
      href={`/trades/${trade.id}`}
      className="block bg-card border border-border rounded-xl p-4 transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99] group"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Symbol & Direction */}
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
          <span
            className={cn(
              'font-mono font-bold text-sm sm:text-base',
              trade.status === 'open'
                ? 'text-amber-400'
                : isProfit
                ? 'text-profit'
                : 'text-loss'
            )}
          >
            {formattedPnl}
          </span>

          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              isComplete
                ? 'bg-profit/10 text-profit border-profit/30'
                : 'bg-muted text-muted-foreground border-border'
            )}
          >
            {isComplete ? (
              <>
                <CheckCircle2 className="h-3 w-3 shrink-0" /> Lengkap
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 shrink-0" /> Belum Lengkap
              </>
            )}
          </span>
        </div>
      </div>
    </Link>
  )
}
