import {
  DashboardSummary,
  CalendarDay,
  WeeklyPerformance,
  SymbolPerformance,
  PerformanceHighlights,
} from '@/types/dashboard'

export const DUMMY_DASHBOARD_SUMMARY: DashboardSummary = {
  totalPnl: 1485.50,
  totalPnlComparison: { value: 18.5, isPositive: true, percentageText: '+18.5% vs bulan lalu' },
  totalTrades: 32,
  totalTradesComparison: { value: 4, isPositive: true, percentageText: '+4 trade vs bulan lalu' },
  winRate: 62.5,
  winRateComparison: { value: 5.2, isPositive: true, percentageText: '+5.2% vs bulan lalu' },
  profitFactor: 2.15,
  profitFactorComparison: { value: 0.35, isPositive: true, percentageText: '+0.35 vs bulan lalu' },
  avgRR: 1.85,
  avgRRComparison: { value: 0.15, isPositive: true, percentageText: '+0.15 vs bulan lalu' },
}

export const DUMMY_CALENDAR_DAYS: CalendarDay[] = [
  { date: '2026-07-01', dayNumber: 1, pnl: 120.0, tradesCount: 2 },
  { date: '2026-07-02', dayNumber: 2, pnl: -45.0, tradesCount: 1 },
  { date: '2026-07-03', dayNumber: 3, pnl: 210.5, tradesCount: 3 },
  { date: '2026-07-06', dayNumber: 6, pnl: 85.0, tradesCount: 1 },
  { date: '2026-07-07', dayNumber: 7, pnl: -110.0, tradesCount: 2 },
  { date: '2026-07-08', dayNumber: 8, pnl: 340.0, tradesCount: 2 },
  { date: '2026-07-09', dayNumber: 9, pnl: 150.0, tradesCount: 1 },
  { date: '2026-07-10', dayNumber: 10, pnl: -80.0, tradesCount: 1 },
  { date: '2026-07-13', dayNumber: 13, pnl: 410.0, tradesCount: 3 },
  { date: '2026-07-14', dayNumber: 14, pnl: -190.0, tradesCount: 2 },
  { date: '2026-07-15', dayNumber: 15, pnl: 270.0, tradesCount: 2 },
  { date: '2026-07-16', dayNumber: 16, pnl: 95.0, tradesCount: 1 },
  { date: '2026-07-17', dayNumber: 17, pnl: -60.0, tradesCount: 1 },
  { date: '2026-07-20', dayNumber: 20, pnl: 180.0, tradesCount: 2 },
  { date: '2026-07-21', dayNumber: 21, pnl: 220.0, tradesCount: 2 },
  { date: '2026-07-22', dayNumber: 22, pnl: -130.0, tradesCount: 1 },
  { date: '2026-07-23', dayNumber: 23, pnl: 145.0, tradesCount: 1 },
  { date: '2026-07-24', dayNumber: 24, pnl: -115.0, tradesCount: 1 },
  { date: '2026-07-27', dayNumber: 27, pnl: 160.0, tradesCount: 1 },
  { date: '2026-07-28', dayNumber: 28, pnl: -125.0, tradesCount: 1 },
  { date: '2026-07-29', dayNumber: 29, pnl: 182.0, tradesCount: 1 },
  { date: '2026-07-30', dayNumber: 30, pnl: 180.0, tradesCount: 1 },
  { date: '2026-07-31', dayNumber: 31, pnl: -25.0, tradesCount: 2 },
]

export const DUMMY_WEEKLY_PERFORMANCE: WeeklyPerformance[] = [
  { weekName: 'Minggu 1', pnl: 285.50, tradesCount: 6 },
  { weekName: 'Minggu 2', pnl: 385.00, tradesCount: 7 },
  { weekName: 'Minggu 3', pnl: 635.00, tradesCount: 9 },
  { weekName: 'Minggu 4', pnl: 392.00, tradesCount: 6 },
  { weekName: 'Minggu 5', pnl: -212.00, tradesCount: 4 },
]

export const DUMMY_SYMBOL_PERFORMANCE: SymbolPerformance[] = [
  { symbol: 'EURUSD', trades: 12, wins: 8, losses: 4, winRate: 66.7, pnl: 645.00 },
  { symbol: 'GBPUSD', trades: 8, wins: 6, losses: 2, winRate: 75.0, pnl: 510.00 },
  { symbol: 'USDJPY', trades: 5, wins: 4, losses: 1, winRate: 80.0, pnl: 382.00 },
  { symbol: 'XAUUSD', trades: 4, wins: 1, losses: 3, winRate: 25.0, pnl: -205.00 },
  { symbol: 'AUDUSD', trades: 3, wins: 1, losses: 2, winRate: 33.3, pnl: -146.50 },
]

export const DUMMY_HIGHLIGHTS: PerformanceHighlights = {
  bestDay: { date: '13 Juli 2026', pnl: 410.00 },
  worstDay: { date: '14 Juli 2026', pnl: -190.00 },
  mostTradesDay: { date: '03 Juli 2026', count: 3 },
  maxWinStreak: 5,
  maxLossStreak: 2,
}
