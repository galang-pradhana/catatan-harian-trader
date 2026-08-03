export interface CompoundingLevelOutput {
  levelNumber: number
  targetPlan: number
  assetPlan: number
  idealLot: number
  riskAmount: number
}

export interface CompoundingInput {
  initialModal: number
  profitPlanPercent: number
  riskPlanPercent: number
  pipRisk: number
  pipValuePerLot?: number
  totalLevels?: number
}

/**
 * Calculates compounding levels with FLOOR step rounding:
 * Target Plan (level n) = FLOOR( Balance(n-1) * Profit Plan %, $10 )
 * Risk (level n)         = FLOOR( Balance(n-1) * Risk Plan %, $5 )
 * Ideal Lot (level n)    = Risk(n) / ( Pip Risk * Nilai per Pip )
 * Asset Plan (level n)   = Balance(n-1) + Target Plan(n)
 */
export function calculateCompoundingLevels(params: CompoundingInput): CompoundingLevelOutput[] {
  const {
    initialModal,
    profitPlanPercent,
    riskPlanPercent,
    pipRisk,
    pipValuePerLot = 10,
    totalLevels = 100
  } = params

  if (initialModal <= 0 || profitPlanPercent <= 0 || riskPlanPercent <= 0 || pipRisk <= 0) {
    throw new Error('COMPOUNDING_INVALID_PARAMS: Parameters must be greater than 0')
  }

  const result: CompoundingLevelOutput[] = []
  let currentBalance = initialModal

  for (let i = 1; i <= totalLevels; i++) {
    // Target Plan floor to multiple of $10
    const rawTarget = currentBalance * (profitPlanPercent / 100)
    const targetPlan = Math.floor(rawTarget / 10) * 10

    // Risk Amount floor to multiple of $5
    const rawRisk = currentBalance * (riskPlanPercent / 100)
    const riskAmount = Math.floor(rawRisk / 5) * 5

    // Ideal Lot
    const denominator = pipRisk * pipValuePerLot
    const rawLot = denominator > 0 ? riskAmount / denominator : 0
    const idealLot = parseFloat(rawLot.toFixed(2))

    // Asset Plan (New Balance)
    const assetPlan = currentBalance + targetPlan

    result.push({
      levelNumber: i,
      targetPlan,
      assetPlan,
      idealLot,
      riskAmount
    })

    currentBalance = assetPlan
  }

  return result
}
