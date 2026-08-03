export interface ExitAnalysis {
  plannedRR: string
  actualRR: string
  exitType: 'hit_tp' | 'hit_sl' | 'premature_tp' | 'premature_sl' | 'running'
  exitTypeLabel: string
  exitBadgeColor: string
}

/**
 * Menganalisis Stop Loss (SL) & Take Profit (TP) dari MT5 untuk menghitung:
 * 1. Planned R:R (Rasio Risk:Reward Rencana)
 * 2. Actual R:R (Rasio Risk:Reward Realisasi)
 * 3. Tipe Exit (Hit TP, Hit SL, Premature Cut Profit, Premature Cut Loss)
 */
export function analyzeTradeExit(trade: {
  direction: string
  open_price: number
  close_price: number | null
  sl: number | null
  tp: number | null
  pnl: number | null
  status: string
}): ExitAnalysis {
  const isBuy = (trade.direction || '').toLowerCase() === 'buy'
  const openPrice = Number(trade.open_price) || 0
  const closePrice = trade.close_price ? Number(trade.close_price) : null
  const sl = trade.sl && Number(trade.sl) > 0 ? Number(trade.sl) : null
  const tp = trade.tp && Number(trade.tp) > 0 ? Number(trade.tp) : null

  // 1. Calculate Planned R:R
  let plannedRisk = 0
  let plannedReward = 0
  let plannedRR = '-'

  if (openPrice > 0 && sl) {
    plannedRisk = Math.abs(openPrice - sl)
  }
  if (openPrice > 0 && tp) {
    plannedReward = Math.abs(tp - openPrice)
  }

  if (plannedRisk > 0 && plannedReward > 0) {
    const ratio = plannedReward / plannedRisk
    plannedRR = `1:${ratio.toFixed(2)}`
  }

  // 2. Calculate Actual R:R
  let actualRR = '-'
  if (trade.status === 'closed' && closePrice && openPrice > 0 && plannedRisk > 0) {
    const actualResult = isBuy ? closePrice - openPrice : openPrice - closePrice
    const ratio = actualResult / plannedRisk
    actualRR = `1:${ratio.toFixed(2)}`
  }

  // 3. Determine Exit Type
  if (trade.status === 'open' || !closePrice) {
    return {
      plannedRR: plannedRR !== '-' ? plannedRR : 'Belum Ada SL/TP',
      actualRR: '-',
      exitType: 'running',
      exitTypeLabel: '🟢 Posisi Running',
      exitBadgeColor: 'bg-primary/15 text-primary border-primary/30',
    }
  }

  const pnl = Number(trade.pnl ?? 0)

  // Threshold tolerance (0.05% of open price) for spread & slippage
  const tolerance = openPrice * 0.0005

  const hitTp = tp && Math.abs(closePrice - tp) <= tolerance
  const hitSl = sl && Math.abs(closePrice - sl) <= tolerance

  if (hitTp) {
    return {
      plannedRR,
      actualRR,
      exitType: 'hit_tp',
      exitTypeLabel: '🎯 Hit TP (Sesuai Target)',
      exitBadgeColor: 'bg-profit/15 text-profit border-profit/30',
    }
  }

  if (hitSl) {
    return {
      plannedRR,
      actualRR,
      exitType: 'hit_sl',
      exitTypeLabel: '🛑 Hit SL (Menyentuh Stop Loss)',
      exitBadgeColor: 'bg-loss/15 text-loss border-loss/30',
    }
  }

  // Premature Exit Detection
  if (pnl >= 0) {
    return {
      plannedRR,
      actualRR,
      exitType: 'premature_tp',
      exitTypeLabel: '⚠️ Premature Exit (Cut Profit Awal)',
      exitBadgeColor: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    }
  } else {
    return {
      plannedRR,
      actualRR,
      exitType: 'premature_sl',
      exitTypeLabel: '⚠️ Premature Exit (Cut Loss Awal)',
      exitBadgeColor: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
    }
  }
}
