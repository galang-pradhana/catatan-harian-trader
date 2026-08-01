import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateSQN, calculateMFEPercent } from '../utils/advanced-statistics.js'

test('calculateSQN handles empty R-multiples', () => {
  const result = calculateSQN([])
  assert.equal(result.score, 0)
  assert.equal(result.rating, 'Kurang')
  assert.equal(result.sampleCount, 0)
})

test('calculateSQN computes correct score and rating for profitable system', () => {
  // Sample R-multiples: [2.0, 1.5, -1.0, 3.0, 2.5, -1.0, 2.0, 1.8]
  const rMultiples = [2.0, 1.5, -1.0, 3.0, 2.5, -1.0, 2.0, 1.8]
  const result = calculateSQN(rMultiples)

  assert.equal(result.sampleCount, 8)
  assert.ok(result.score > 1.5, 'SQN score should be positive and > 1.5')
  assert.ok(['Rata-Rata', 'Baik', 'Sangat Baik'].includes(result.rating))
})

test('calculateMFEPercent calculates buy exit efficiency correctly', () => {
  // Buy Entry 100.00, Exit 108.00, Max MFE Peak 110.00 -> Actual 8 pips / Max 10 pips = 80%
  const eff = calculateMFEPercent(100.00, 108.00, 110.00, 'buy')
  assert.equal(eff, 80.0)
})

test('calculateMFEPercent calculates sell exit efficiency correctly', () => {
  // Sell Entry 100.00, Exit 92.00, Max MFE Low 90.00 -> Actual 8 pips / Max 10 pips = 80%
  const eff = calculateMFEPercent(100.00, 92.00, 90.00, 'sell')
  assert.equal(eff, 80.0)
})
