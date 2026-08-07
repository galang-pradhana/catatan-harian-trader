import test from 'node:test'
import assert from 'node:assert/strict'
import { computeTradeActualRR } from '../utils/trade-metrics.js'

test('computeTradeActualRR prefers manual journal entry when present', () => {
  const trade = {
    direction: 'buy',
    open_price: 1.1000,
    close_price: 1.1100,
    sl: 1.0950,
    trade_journal: { actual_rr: 3.5 },
  }
  assert.equal(computeTradeActualRR(trade), 3.5)
})

test('computeTradeActualRR auto-computes R:R from SL & prices for BUY', () => {
  const trade = {
    direction: 'buy',
    open_price: 1.1000,
    close_price: 1.1100, // +100 pips
    sl: 1.0950,          // risk = 50 pips
    trade_journal: null,
  }
  // 100 / 50 = 2.0
  assert.equal(computeTradeActualRR(trade), 2.0)
})

test('computeTradeActualRR auto-computes R:R from SL & prices for SELL', () => {
  const trade = {
    direction: 'sell',
    open_price: 1.1000,
    close_price: 1.0900, // +100 pips profit
    sl: 1.1050,          // risk = 50 pips
    trade_journal: null,
  }
  // 100 / 50 = 2.0
  assert.equal(computeTradeActualRR(trade), 2.0)
})

test('computeTradeActualRR returns negative R:R when trade closes in loss', () => {
  const trade = {
    direction: 'buy',
    open_price: 1.1000,
    close_price: 1.0950, // -50 pips loss (hit SL)
    sl: 1.0950,          // risk = 50 pips
    trade_journal: null,
  }
  // -50 / 50 = -1.0
  assert.equal(computeTradeActualRR(trade), -1.0)
})

test('computeTradeActualRR returns null (unrated) when SL is missing and no journal entry', () => {
  const tradeNoSL = {
    direction: 'buy',
    open_price: 1.1000,
    close_price: 1.1100,
    sl: null,
    trade_journal: null,
  }
  assert.equal(computeTradeActualRR(tradeNoSL), null)
})
