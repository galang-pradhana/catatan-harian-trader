import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { calculateCompoundingLevels } from '@/utils/compounding'

export async function GET(
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

    // 1. Fetch compounding plan
    const { data: plan, error: planError } = await supabase
      .from('compounding_plans')
      .select('*, compounding_levels(*), mt5_connections(name, balance)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan tidak ditemukan' }, { status: 404 })
    }

    const levels = (plan.compounding_levels || []).sort((a: any, b: any) => a.level_number - b.level_number)
    const currentBalance = plan.mt5_connections?.balance ? Number(plan.mt5_connections.balance) : Number(plan.initial_modal)

    // Format levels
    const formattedLevels = levels.map((lvl: any) => ({
      id: lvl.id,
      level: lvl.level_number,
      targetPlan: Number(lvl.target_plan),
      assetPlan: Number(lvl.asset_plan),
      idealLot: Number(lvl.ideal_lot),
      riskAmount: Number(lvl.risk_amount),
      isAchieved: Boolean(lvl.is_achieved),
      manualOverride: Boolean(lvl.manual_override),
      achievedAt: lvl.achieved_at ? lvl.achieved_at : null
    }))

    // Calculate current active level
    let currentActiveLevel = 1
    for (let i = 0; i < formattedLevels.length; i++) {
      if (formattedLevels[i].isAchieved || currentBalance >= formattedLevels[i].assetPlan) {
        currentActiveLevel = formattedLevels[i].level + 1
      } else {
        currentActiveLevel = formattedLevels[i].level
        break
      }
    }

    return NextResponse.json({
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        mt5_connection_id: plan.mt5_connection_id,
        source: plan.mt5_connections?.name || 'Manual Balance',
        initialModal: Number(plan.initial_modal),
        isManualModal: Boolean(plan.is_manual_modal),
        profitPlanPercent: Number(plan.profit_plan_percent),
        riskPlanPercent: Number(plan.risk_plan_percent),
        pipRisk: Number(plan.pip_risk),
        pipValue: Number(plan.pip_value_per_lot || 10),
        goalLevelTarget: plan.goal_level_target || 100,
        rulesNotes: plan.rules_notes || '',
        isActive: Boolean(plan.is_active || plan.status === 'active'),
        isArchived: Boolean(plan.is_archived),
        status: plan.status || 'active',
        createdAt: plan.created_at,
        currentActiveLevel,
        currentBalance,
      },
      levels: formattedLevels
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(
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

    const body = await request.json()
    const {
      name,
      rules_notes,
      is_active,
      is_archived,
      initial_modal,
      profit_plan_percent,
      risk_plan_percent,
      pip_risk,
      pip_value_per_lot
    } = body

    // 1. Fetch existing plan
    const { data: existingPlan, error: fetchErr } = await supabase
      .from('compounding_plans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !existingPlan) {
      return NextResponse.json({ error: 'Plan tidak ditemukan' }, { status: 404 })
    }

    // 2. Handle active status toggle
    if (is_active === true) {
      await supabase
        .from('compounding_plans')
        .update({ is_active: false, status: 'inactive' })
        .eq('user_id', user.id)
    }

    const updatePayload: any = {}
    if (name !== undefined) updatePayload.name = name
    if (rules_notes !== undefined) updatePayload.rules_notes = rules_notes
    if (is_active !== undefined) {
      updatePayload.is_active = Boolean(is_active)
      updatePayload.status = is_active ? 'active' : 'inactive'
    }
    if (is_archived !== undefined) updatePayload.is_archived = Boolean(is_archived)

    let financialParamsChanged = false
    if (initial_modal !== undefined && Number(initial_modal) !== Number(existingPlan.initial_modal)) {
      updatePayload.initial_modal = parseFloat(initial_modal)
      financialParamsChanged = true
    }
    if (profit_plan_percent !== undefined && Number(profit_plan_percent) !== Number(existingPlan.profit_plan_percent)) {
      updatePayload.profit_plan_percent = parseFloat(profit_plan_percent)
      financialParamsChanged = true
    }
    if (risk_plan_percent !== undefined && Number(risk_plan_percent) !== Number(existingPlan.risk_plan_percent)) {
      updatePayload.risk_plan_percent = parseFloat(risk_plan_percent)
      financialParamsChanged = true
    }
    if (pip_risk !== undefined && Number(pip_risk) !== Number(existingPlan.pip_risk)) {
      updatePayload.pip_risk = parseFloat(pip_risk)
      financialParamsChanged = true
    }
    if (pip_value_per_lot !== undefined && Number(pip_value_per_lot) !== Number(existingPlan.pip_value_per_lot)) {
      updatePayload.pip_value_per_lot = parseFloat(pip_value_per_lot)
      financialParamsChanged = true
    }

    updatePayload.updated_at = new Date().toISOString()

    const { data: updatedPlan, error: updateErr } = await supabase
      .from('compounding_plans')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateErr) throw updateErr

    // If financial parameters changed, recalculate level numbers
    if (financialParamsChanged) {
      const calculated = calculateCompoundingLevels({
        initialModal: Number(updatedPlan.initial_modal),
        profitPlanPercent: Number(updatedPlan.profit_plan_percent),
        riskPlanPercent: Number(updatedPlan.risk_plan_percent),
        pipRisk: Number(updatedPlan.pip_risk),
        pipValuePerLot: Number(updatedPlan.pip_value_per_lot || 10),
        totalLevels: 100
      })

      // Delete existing levels & re-insert
      await supabase.from('compounding_levels').delete().eq('plan_id', id)

      const levelsToInsert = calculated.map((lvl) => ({
        plan_id: id,
        level_number: lvl.levelNumber,
        target_plan: lvl.targetPlan,
        asset_plan: lvl.assetPlan,
        ideal_lot: lvl.idealLot,
        risk_amount: lvl.riskAmount,
        is_achieved: false
      }))

      await supabase.from('compounding_levels').insert(levelsToInsert)
    }

    return NextResponse.json({ success: true, plan: updatedPlan })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
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

    // Delete plan (levels & goal entries cascade delete in DB)
    const { error } = await supabase
      .from('compounding_plans')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Plan compounding berhasil dihapus' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
