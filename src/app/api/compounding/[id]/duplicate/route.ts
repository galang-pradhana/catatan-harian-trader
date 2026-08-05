import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { calculateCompoundingLevels } from '@/utils/compounding'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch original plan
    const { data: sourcePlan, error: fetchErr } = await supabase
      .from('compounding_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !sourcePlan) {
      return NextResponse.json({ error: 'Plan asal tidak ditemukan' }, { status: 404 })
    }

    // Insert duplicated plan
    const { data: newPlan, error: insertErr } = await supabase
      .from('compounding_plans')
      .insert({
        user_id: user.id,
        mt5_connection_id: sourcePlan.mt5_connection_id,
        name: `${sourcePlan.name} (Salinan)`,
        initial_modal: sourcePlan.initial_modal,
        is_manual_modal: sourcePlan.is_manual_modal,
        profit_plan_percent: sourcePlan.profit_plan_percent,
        risk_plan_percent: sourcePlan.risk_plan_percent,
        pip_risk: sourcePlan.pip_risk,
        pip_value_per_lot: sourcePlan.pip_value_per_lot,
        goal_level_target: sourcePlan.goal_level_target,
        rules_notes: sourcePlan.rules_notes,
        is_active: false,
        status: 'inactive'
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Generate levels for duplicated plan
    const calculated = calculateCompoundingLevels({
      initialModal: Number(newPlan.initial_modal),
      profitPlanPercent: Number(newPlan.profit_plan_percent),
      riskPlanPercent: Number(newPlan.risk_plan_percent),
      pipRisk: Number(newPlan.pip_risk),
      pipValuePerLot: Number(newPlan.pip_value_per_lot || 10),
      totalLevels: 100
    })

    const levelsToInsert = calculated.map((lvl) => ({
      plan_id: newPlan.id,
      level_number: lvl.levelNumber,
      target_plan: lvl.targetPlan,
      asset_plan: lvl.assetPlan,
      ideal_lot: lvl.idealLot,
      risk_amount: lvl.riskAmount,
      is_achieved: false
    }))

    await supabase.from('compounding_levels').insert(levelsToInsert)

    return NextResponse.json({ success: true, plan: newPlan })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
