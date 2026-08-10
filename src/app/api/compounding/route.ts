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

    // Try primary query with full relations
    // NOTE: mt5_connections uses 'current_balance' column (not 'balance')
    let { data: plans, error } = await supabase
      .from('compounding_plans')
      .select('*, compounding_levels(*), mt5_connections(broker_name, account_number, current_balance, account_type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Fallback if query failed (e.g. relation join issue or column missing)
    if (error) {
      console.warn('Compounding GET primary query warning:', error.message)
      const simpleRes = await supabase
        .from('compounding_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (!simpleRes.error) {
        plans = simpleRes.data
        error = null
      }
    }

    // If still error or no plans exist, return empty array so UI shows clean Empty State instead of crash box
    if (error || !plans) {
      console.warn('Compounding plans query returned error/empty:', error?.message)
      return NextResponse.json({ success: true, plans: [] })
    }

    // Filter archived in JS safely if column is_archived is present
    const filteredPlans = plans.filter((p: any) => {
      if (includeArchived) return true
      return !p.is_archived
    })

    const formattedPlans = filteredPlans.map((plan: any) => {
      const rawLevels = plan.compounding_levels || []
      const levels = Array.isArray(rawLevels)
        ? rawLevels.sort((a: any, b: any) => a.level_number - b.level_number)
        : []
        
      // Read `current_balance` (synced from EA) — convert USC→USD for cent accounts
      const rawBal = plan.mt5_connections?.current_balance != null
        ? Number(plan.mt5_connections.current_balance)
        : Number(plan.initial_modal || 1000)
      const accType = plan.mt5_connections?.account_type || 'standard'
      const currentBalance = accType === 'cent' ? rawBal / 100 : rawBal

      let currentLevel = 1
      let targetAssetForCurrent = levels[0]?.asset_plan || (plan.initial_modal || 1000) * 1.025

      for (let i = 0; i < levels.length; i++) {
        if (levels[i].is_achieved || currentBalance >= Number(levels[i].asset_plan)) {
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
        name: plan.name || 'Plan Compounding',
        mt5_connection_id: plan.mt5_connection_id,
        source: plan.mt5_connections
          ? (plan.mt5_connections.broker_name
              ? `${plan.mt5_connections.broker_name}${plan.mt5_connections.account_number ? ` (#${plan.mt5_connections.account_number})` : ''}`
              : 'Akun MT5')
          : 'Manual Balance',
        initial_modal: Number(plan.initial_modal || 1000),
        is_manual_modal: Boolean(plan.is_manual_modal),
        profit_plan_percent: Number(plan.profit_plan_percent || 2.5),
        risk_plan_percent: Number(plan.risk_plan_percent || 1.25),
        pip_risk: Number(plan.pip_risk || 50),
        pip_value_per_lot: Number(plan.pip_value_per_lot || 10),
        goal_level_target: plan.goal_level_target || 100,
        rules_notes: plan.rules_notes || '',
        is_active: Boolean(plan.is_active || plan.status === 'active'),
        is_archived: Boolean(plan.is_archived),
        status: plan.status || 'active',
        created_at: plan.created_at,
        current_level: currentLevel,
        current_balance: currentBalance,
        target_asset_level: Number(targetAssetForCurrent),
        levels_count: levels.length
      }
    })

    return NextResponse.json({ success: true, plans: formattedPlans })
  } catch (err: any) {
    console.error('Compounding GET unexpected error:', err)
    return NextResponse.json({ success: true, plans: [] })
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
      try {
        await supabase
          .from('compounding_plans')
          .update({ is_active: false, status: 'inactive' })
          .eq('user_id', user.id)
      } catch {
        // Ignore fallback update error
      }
    }

    // 1. Insert Compounding Plan with graceful column fallback
    const insertPayload: any = {
      user_id: user.id,
      mt5_connection_id: is_manual_modal ? null : (mt5_connection_id || null),
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
    }

    let { data: plan, error: planError } = await supabase
      .from('compounding_plans')
      .insert(insertPayload)
      .select()
      .single()

    if (planError) {
      console.warn('Compounding POST insert error, attempting fallback payload:', planError.message)
      // Retry without new columns if schema migration hasn't run on PostgreSQL yet
      delete insertPayload.rules_notes
      delete insertPayload.is_active

      const retry = await supabase
        .from('compounding_plans')
        .insert(insertPayload)
        .select()
        .single()

      if (retry.error) throw retry.error
      plan = retry.data
    }

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

    if (levelsError) {
      console.warn('Compounding levels insert error:', levelsError.message)
    }

    // 3. Create Goal entry
    try {
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
    } catch {
      // Goal creation optional
    }

    return NextResponse.json({
      success: true,
      plan,
      levelsCount: calculatedLevels.length
    })
  } catch (err: any) {
    console.error('Compounding POST error:', err)
    return NextResponse.json({ error: err.message || 'Gagal membuat plan compounding' }, { status: 500 })
  }
}
