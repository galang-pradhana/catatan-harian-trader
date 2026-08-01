/**
 * advanced-statistics.ts
 * Utility functions for Van Tharp SQN and MFE Exit Efficiency calculation.
 */

// ── SQN (System Quality Number) Calculation ────────────────────
/**
 * Rumus SQN (Van Tharp):
 * SQN = (Mean(R-multiples) / StandardDeviation(R-multiples)) * sqrt(min(N, 100))
 * 
 * Skala Kategori:
 * - < 1.6  : Kurang / Perlu perbaikan
 * - 1.6 - 2.4 : Rata-Rata (Average)
 * - 2.5 - 2.9 : Baik (Good)
 * - >= 3.0 : Sangat Baik (Holy Grail)
 */
export function calculateSQN(rMultiples: number[]): {
  score: number
  rating: 'Kurang' | 'Rata-Rata' | 'Baik' | 'Sangat Baik'
  sampleCount: number
} {
  const validR = rMultiples.filter((r) => typeof r === 'number' && !isNaN(r))
  const count  = validR.length

  if (count === 0) {
    return { score: 0, rating: 'Kurang', sampleCount: 0 }
  }

  const mean = validR.reduce((sum, val) => sum + val, 0) / count

  // Standard Deviation
  const variance = validR.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count
  const stdDev   = Math.sqrt(variance)

  if (stdDev === 0) {
    return { score: mean > 0 ? 3.0 : 0, rating: mean > 0 ? 'Sangat Baik' : 'Kurang', sampleCount: count }
  }

  const sampleMultiplier = Math.sqrt(Math.min(count, 100))
  const score = (mean / stdDev) * sampleMultiplier
  const roundedScore = Math.round(score * 100) / 100

  let rating: 'Kurang' | 'Rata-Rata' | 'Baik' | 'Sangat Baik' = 'Kurang'
  if (roundedScore >= 3.0)      rating = 'Sangat Baik'
  else if (roundedScore >= 2.5) rating = 'Baik'
  else if (roundedScore >= 1.6) rating = 'Rata-Rata'

  return {
    score: roundedScore,
    rating,
    sampleCount: count,
  }
}

// ── MFE Exit Efficiency Calculation ───────────────────────────
/**
 * Efisiensi Exit = (Actual Profit / MFE Potential Profit) * 100
 * MFE = Maximum Favorable Excursion (harga tertinggi/terendah tercapai saat trade open).
 */
export function calculateMFEPercent(
  openPrice: number,
  closePrice: number,
  mfePrice: number,
  direction: 'buy' | 'sell'
): number | null {
  if (!openPrice || !closePrice || !mfePrice) return null

  let actualPips = 0
  let maxPips    = 0

  if (direction === 'buy') {
    actualPips = closePrice - openPrice
    maxPips    = mfePrice - openPrice
  } else {
    actualPips = openPrice - closePrice
    maxPips    = openPrice - mfePrice
  }

  if (maxPips <= 0) return 100.0 // Exit di puncak atau tidak ada MFE berlawanan

  const eff = (actualPips / maxPips) * 100
  return Math.min(Math.max(Math.round(eff * 10) / 10, 0), 100)
}
