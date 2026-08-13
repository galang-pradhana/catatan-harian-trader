/**
 * Utility untuk Kalkulasi Pips Gained & Seeding Default Pip Size (Addendum V7)
 */

export interface PipConfig {
  pip_size: number
  is_confirmed: boolean
}

/**
 * Mendapatkan default pip_size berdasarkan jenis simbol.
 * Rules PRD V7:
 * - Forex non-JPY: default 0.0001 (is_confirmed: false)
 * - Forex JPY: default 0.01 (is_confirmed: false)
 * - XAUUSD / Gold / Index / Crypto / Simbol lain: TIDAK ADA default yang aman -> return null (is_confirmed: false)
 */
export function getDefaultPipConfig(symbol: string): PipConfig | null {
  const sym = symbol.toUpperCase().trim()

  // Non-forex (XAUUSD/Gold, Indices, Crypto, Commodities) -> Tidak ada default aman
  if (
    sym.includes('XAU') ||
    sym.includes('GOLD') ||
    sym.includes('BTC') ||
    sym.includes('ETH') ||
    sym.includes('US30') ||
    sym.includes('NAS') ||
    sym.includes('GER') ||
    sym.includes('OIL') ||
    sym.includes('SPX')
  ) {
    return null
  }

  // Forex JPY pairs (contoh: USDJPY, EURJPY, GBPJPY, AUDJPY, CADJPY, NZDJPY, CHFJPY)
  if (sym.includes('JPY')) {
    return { pip_size: 0.01, is_confirmed: false }
  }

  // Major/Minor Forex non-JPY (biasanya 6 karakter seperti EURUSD, GBPUSD, AUDUSD, NZDUSD, USDCAD, USDCHF, EURGBP, dll)
  if (sym.length >= 6 && sym.length <= 7) {
    return { pip_size: 0.0001, is_confirmed: false }
  }

  return null
}

/**
 * Menghitung Pips Gained per closed trade.
 * Buy: (close_price - open_price) / pip_size
 * Sell: (open_price - close_price) / pip_size
 *
 * Mengembalikan null jika close_price tidak ada, pip_size invalid, atau is_confirmed === false
 */
export function calculatePipsGained(
  direction: 'buy' | 'sell',
  openPrice: number,
  closePrice: number | null | undefined,
  pipSize: number | null | undefined,
  isConfirmed: boolean
): number | null {
  if (!isConfirmed || closePrice == null || !pipSize || pipSize <= 0 || !openPrice) {
    return null
  }

  const diff = direction === 'buy' ? closePrice - openPrice : openPrice - closePrice
  const pips = diff / pipSize

  // Bulatkan 2 desimal
  return Math.round(pips * 100) / 100
}
