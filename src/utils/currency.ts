export type AccountType = 'standard' | 'cent'

export interface CurrencyConversionResult {
  usd: number
  usc: number
}

/**
 * Mengonversi nilai dari akun trading berdasarkan tipe akun (Standar USD vs Cent USC).
 * Pada Akun Cent: 100 USC = 1 USD (1 USC = 0.01 USD).
 */
export function convertAccountValue(
  amount: number,
  accountType: AccountType = 'standard'
): CurrencyConversionResult {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0

  if (accountType === 'cent') {
    return {
      usd: num / 100,
      usc: num,
    }
  }

  return {
    usd: num,
    usc: num * 100,
  }
}

/**
 * Format string tampilan nominal uang berdasarkan tipe akun.
 */
export function formatCurrency(
  amount: number,
  accountType: AccountType = 'standard',
  options: {
    displayMode?: 'usd' | 'usc' | 'auto'
    showUnit?: boolean
    decimals?: number
  } = {}
): string {
  const { displayMode = 'usd', showUnit = true, decimals = 2 } = options
  const converted = convertAccountValue(amount, accountType)

  if (displayMode === 'usc') {
    const formattedUsc = converted.usc.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    return showUnit ? `${formattedUsc} USC` : formattedUsc
  }

  // Default USD display mode ($)
  const isNegative = converted.usd < 0
  const absUsd = Math.abs(converted.usd)
  const formattedUsd = absUsd.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  const prefix = isNegative ? '-$' : '$'
  const unitSuffix = accountType === 'cent' && showUnit ? ' (USC)' : ''

  return `${prefix}${formattedUsd}${unitSuffix}`
}

/**
 * Label penjelas tipe akun
 */
export function getAccountTypeLabel(accountType: AccountType = 'standard'): string {
  return accountType === 'cent' ? 'Akun Cent (USC)' : 'Akun Standar (USD)'
}
