import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { calculateCompoundingLevels } from '@/utils/compounding'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: plans, error } = await supabase
      .from('compounding_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, plans: plans || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      mt5_connection_id,
      initial_modal,
      is_manual_modal,
      profit_plan_percent,
      risk_plan_percent,
      pip_risk,
      pip_value_per_lot = 10,
      goal_level_target = 100
    } = body

    if (!name || !initial_modal || !profit_plan_percent || !risk_plan_percent || !pip_risk) {
      return NextResponse.json(
        { error: 'COMPOUNDING_INVALID_PARAMS: All parameters are required' },
        { status: 400 }
      )
    }

    // 1. Insert Compounding Plan
    const { data: plan, error: planError } = await supabase
      .from('compounding_plans')
      .insert({
        user_id: user.id,
        mt5_connection_id: is_manual_modal ? null : mt5_connection_id,
        name,
        initial_modal: parseFloat(initial_modal),
        is_manual_modal: Boolean(is_manual_modal),
        profit_plan_percent: parseFloat(profit_plan_percent),
        risk_plan_percent: parseFloat(risk_plan_percent),
        pip_risk: parseFloat(pip_risk),
        pip_value_per_lot: parseFloat(pip_value_per_lot),
        goal_level_target: parseInt(goal_level_target, 10),
        status: 'active'
      })
      .select()
      .single()

    if (planError) throw planError

    // 2. Generate 100 levels
    const calculatedLevels = calculateCompoundingLevels({
      initialModal: parseFloat(initial_modal),
      profitPlanPercent: parseFloat(profit_plan_percent),
      riskPlanPercent: parseFloat(risk_plan_percent),
      pipRisk: parseFloat(pip_risk),
      pipValuePerLot: parseFloat(pip_value_per_lot),
      totalLevels: 100
    })

    const levelsToInsert = calculatedLevels.map((lvl) => ({
      plan_id: plan.id,
      level_number: lvl.levelNumber,
      target_plan: lvl.targetPlan,
      asset_plan: lvl.assetPlan,
      ideal_lot: lvl.idealLot,
      risk_amount: lvl.riskAmount,
      is_achieved: false
    }))

    const { error: levelsError } = await supabase
      .from('compounding_levels')
      .insert(levelsToInsert)

    if (levelsError) throw levelsError

    // 3. Create Goal entry automatically (F-19 Integration)
    const targetAssetLevel = calculatedLevels[goal_level_target - 1]?.assetPlan || calculatedLevels[calculatedLevels.length - 1].assetPlan

    await supabase.from('goals').insert({
      user_id: user.id,
      title: `Compounding Plan: ${name} (Target Level ${goal_level_target})`,
      type: 'compounding_level',
      target_value: targetAssetLevel,
      current_progress: 0,
      status: 'active',
      source_plan_id: plan.id
    })

    return NextResponse.json({
      success: true,
      plan,
      levelsCount: calculatedLevels.length
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
