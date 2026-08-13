import test from 'node:test'
import assert from 'node:assert/strict'
import { getDefaultPipConfig, calculatePipsGained } from '../utils/pip-calculator'

test('TC-701: Hitung pips EURUSD (pip_size 0.0001, confirmed)', () => {
  const buyPips = calculatePipsGained('buy', 1.08500, 1.09305, 0.0001, true)
  assert.equal(buyPips, 80.5)

  const sellPips = calculatePipsGained('sell', 1.09305, 1.08500, 0.0001, true)
  assert.equal(sellPips, 80.5)
})

test('TC-702: Hitung pips XAUUSD sebelum pip size dikonfirmasi (isConfirmed: false)', () => {
  const defaultConfig = getDefaultPipConfig('XAUUSD')
  assert.equal(defaultConfig, null)

  // Meskipun pipSize diisi 0.1, jika isConfirmed: false -> pipsGained HARUS null
  const pipsBeforeConfirm = calculatePipsGained('buy', 2350.00, 2360.00, 0.1, false)
  assert.equal(pipsBeforeConfirm, null)

  // Setelah user konfirmasi (isConfirmed: true)
  const pipsAfterConfirm = calculatePipsGained('buy', 2350.00, 2360.00, 0.1, true)
  assert.equal(pipsAfterConfirm, 100)
})

test('Default Pip Config untuk Forex Non-JPY & JPY', () => {
  const eurusd = getDefaultPipConfig('EURUSD')
  assert.deepEqual(eurusd, { pip_size: 0.0001, is_confirmed: false })

  const usdjpy = getDefaultPipConfig('USDJPY')
  assert.deepEqual(usdjpy, { pip_size: 0.01, is_confirmed: false })
})
