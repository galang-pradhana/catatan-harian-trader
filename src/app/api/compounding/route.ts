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

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('include_archived') === 'true'

    let query = supabase
      .from('compounding_plans')
      .select('*, compounding_levels(*), mt5_connections(name, balance)')
      .eq('user_id', user.id)

    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    const { data: plans, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    // Format plans with active level & current balance metrics
    const formattedPlans = (plans || []).map((plan) => {
      const levels = (plan.compounding_levels || []).sort((a: any, b: any) => a.level_number - b.level_number)
      const currentBalance = plan.mt5_connections?.balance ? Number(plan.mt5_connections.balance) : Number(plan.initial_modal)
      
      // Calculate current level
      let currentLevel = 1
      let targetAssetForCurrent = levels[0]?.asset_plan || plan.initial_modal * 1.025

      for (let i = 0; i < levels.length; i++) {
        if (levels[i].is_achieved || currentBalance >= levels[i].asset_plan) {
          currentLevel = levels[i].level_number + 1
          targetAssetForCurrent = levels[i + 1]?.asset_plan || levels[i].asset_plan
        } else {
          currentLevel = levels[i].level_number
          targetAssetForCurrent = levels[i].asset_plan
          break
        }
      }

      return {
        id: plan.id,
        name: plan.name,
        mt5_connection_id: plan.mt5_connection_id,
        source: plan.mt5_connections?.name || 'Manual Balance',
        initial_modal: Number(plan.initial_modal),
        is_manual_modal: Boolean(plan.is_manual_modal),
        profit_plan_percent: Number(plan.profit_plan_percent),
        risk_plan_percent: Number(plan.risk_plan_percent),
        pip_risk: Number(plan.pip_risk),
        pip_value_per_lot: Number(plan.pip_value_per_lot),
        goal_level_target: plan.goal_level_target || 100,
        rules_notes: plan.rules_notes || '',
        is_active: Boolean(plan.is_active || plan.status === 'active'),
        is_archived: Boolean(plan.is_archived),
        status: plan.status || 'active',
        created_at: plan.created_at,
        current_level: currentLevel,
        current_balance: currentBalance,
        target_asset_level: targetAssetForCurrent,
        levels_count: levels.length
      }
    })

    return NextResponse.json({ success: true, plans: formattedPlans })
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
      goal_level_target = 100,
      rules_notes = '',
      set_active = true
    } = body

    if (!name || !initial_modal || !profit_plan_percent || !risk_plan_percent || !pip_risk) {
      return NextResponse.json(
        { error: 'COMPOUNDING_INVALID_PARAMS: All parameters are required' },
        { status: 400 }
      )
    }

    // If set_active, deactivate other plans
    if (set_active) {
      await supabase
        .from('compounding_plans')
        .update({ is_active: false, status: 'inactive' })
        .eq('user_id', user.id)
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
        rules_notes: String(rules_notes || ''),
        is_active: Boolean(set_active),
        status: set_active ? 'active' : 'inactive'
      })
      .select()
      .single()

    if (planError) throw planError

    // 2. Generate 100 compounding levels
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

    // 3. Create Goal entry
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
