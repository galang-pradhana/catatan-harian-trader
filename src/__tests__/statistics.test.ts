import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateWinRate,
  calculateProfitFactor,
  calculateAvgRR,
  calculateMaxStreak,
  calculateTotalPnl,
  groupByDay,
  groupByWeek,
  groupBySymbol,
  findBestWorstDay,
  findMostTradesDay,
  type TradeStat,
} from '../utils/statistics.js'

test('calculateWinRate handles 0 trades', () => {
  assert.equal(calculateWinRate([]), 0)
})

test('calculateWinRate computes correct percentage', () => {
  const trades: TradeStat[] = [
    { pnl: 100, status: 'closed', close_time: '2026-07-01T10:00:00Z', open_time: '2026-07-01T09:00:00Z' },
    { pnl: -50, status: 'closed', close_time: '2026-07-01T12:00:00Z', open_time: '2026-07-01T11:00:00Z' },
    { pnl: 200, status: 'closed', close_time: '2026-07-02T10:00:00Z', open_time: '2026-07-02T09:00:00Z' },
    { pnl: null, status: 'open', close_time: null, open_time: '2026-07-02T14:00:00Z' },
  ]
  // 2 wins out of 3 closed = 66.666...%
  const rate = calculateWinRate(trades)
  assert.equal(Math.round(rate * 100) / 100, 66.67)
})

test('calculateProfitFactor handles zero loss without division by zero', () => {
  const allWin: TradeStat[] = [
    { pnl: 100, status: 'closed', close_time: '2026-07-01T10:00:00Z', open_time: '2026-07-01T09:00:00Z' },
  ]
  assert.equal(calculateProfitFactor(allWin), 999)

  const empty: TradeStat[] = []
  assert.equal(calculateProfitFactor(empty), 0)
})

test('calculateProfitFactor computes gross profit / gross loss', () => {
  const trades: TradeStat[] = [
    { pnl: 300, status: 'closed', close_time: '2026-07-01T10:00:00Z', open_time: '2026-07-01T09:00:00Z' },
    { pnl: -100, status: 'closed', close_time: '2026-07-01T12:00:00Z', open_time: '2026-07-01T11:00:00Z' },
  ]
  // 300 / 100 = 3.0
  assert.equal(calculateProfitFactor(trades), 3)
})

test('calculateAvgRR averages filled actual_rr values', () => {
  const trades = [
    { pnl: 100, status: 'closed' as const, close_time: '2026-07-01', open_time: '2026-07-01', actual_rr: 2.0 },
    { pnl: -50, status: 'closed' as const, close_time: '2026-07-01', open_time: '2026-07-01', actual_rr: 1.0 },
    { pnl: 50, status: 'closed' as const, close_time: '2026-07-01', open_time: '2026-07-01', actual_rr: null },
  ]
  // (2.0 + 1.0) / 2 = 1.5
  assert.equal(calculateAvgRR(trades), 1.5)
})

test('calculateMaxStreak computes longest consecutive win and loss streaks', () => {
  const trades: TradeStat[] = [
    { pnl: 100, status: 'closed', close_time: '2026-07-01T10:00:00Z', open_time: '2026-07-01T09:00:00Z' },
    { pnl: 50, status: 'closed', close_time: '2026-07-01T11:00:00Z', open_time: '2026-07-01T09:00:00Z' },
    { pnl: -20, status: 'closed', close_time: '2026-07-01T12:00:00Z', open_time: '2026-07-01T09:00:00Z' },
    { pnl: -30, status: 'closed', close_time: '2026-07-01T13:00:00Z', open_time: '2026-07-01T09:00:00Z' },
    { pnl: -10, status: 'closed', close_time: '2026-07-01T14:00:00Z', open_time: '2026-07-01T09:00:00Z' },
    { pnl: 150, status: 'closed', close_time: '2026-07-01T15:00:00Z', open_time: '2026-07-01T09:00:00Z' },
  ]

  assert.equal(calculateMaxStreak(trades, 'win'), 2)
  assert.equal(calculateMaxStreak(trades, 'loss'), 3)
})

test('groupBySymbol calculates per-symbol statistics correctly', () => {
  const trades = [
    { symbol: 'EURUSD', pnl: 100, status: 'closed' as const, close_time: '2026-07-01', open_time: '2026-07-01' },
    { symbol: 'EURUSD', pnl: -50, status: 'closed' as const, close_time: '2026-07-01', open_time: '2026-07-01' },
    { symbol: 'GBPUSD', pnl: 200, status: 'closed' as const, close_time: '2026-07-01', open_time: '2026-07-01' },
  ]

  const bySym = groupBySymbol(trades)
  assert.equal(bySym.length, 2)
  // First item sorted by PnL desc -> GBPUSD (+200), then EURUSD (+50)
  assert.equal(bySym[0].symbol, 'GBPUSD')
  assert.equal(bySym[0].pnl, 200)
  assert.equal(bySym[1].symbol, 'EURUSD')
  assert.equal(bySym[1].pnl, 50)
  assert.equal(bySym[1].winRate, 50)
})

test('findBestWorstDay identifies highest and lowest PnL days', () => {
  const dayMap = new Map<string, { pnl: number; count: number }>()
  dayMap.set('2026-07-01', { pnl: 150, count: 2 })
  dayMap.set('2026-07-02', { pnl: -80, count: 1 })
  dayMap.set('2026-07-03', { pnl: 300, count: 3 })

  const { bestDay, worstDay } = findBestWorstDay(dayMap)
  assert.deepEqual(bestDay, { date: '2026-07-03', pnl: 300 })
  assert.deepEqual(worstDay, { date: '2026-07-02', pnl: -80 })
})
