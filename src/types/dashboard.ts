export interface StatComparison {
  value: number
  label?: string
  // legacy fields kept for backward compat
  isPositive?: boolean
  percentageText?: string
}

export interface DashboardSummary {
  totalPnl: number
  totalPnlComparison: StatComparison
  totalTrades: number
  totalTradesComparison: StatComparison
  winRate: number
  winRateComparison: StatComparison
  profitFactor: number
  profitFactorComparison: StatComparison
  avgRR: number
  avgRRComparison: StatComparison
}

export interface CalendarDay {
  date: string // YYYY-MM-DD
  dayNumber: number
  pnl?: number
  tradesCount?: number
}

export interface WeeklyPerformance {
  weekName: string
  pnl: number
  tradesCount: number
}

export interface SymbolPerformance {
  symbol: string
  trades: number
  wins: number
  losses: number
  winRate: number
  pnl: number
}

export interface PerformanceHighlights {
  bestDay:       { date: string; pnl: number } | null
  worstDay:      { date: string; pnl: number } | null
  mostTradesDay: { date: string; count: number } | null
  maxWinStreak:  number
  maxLossStreak: number
}
