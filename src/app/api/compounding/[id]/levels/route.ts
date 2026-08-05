import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { level_number, is_achieved } = body

    if (level_number === undefined || is_achieved === undefined) {
      return NextResponse.json({ error: 'level_number and is_achieved are required' }, { status: 400 })
    }

    // Verify ownership
    const { data: plan, error: planError } = await supabase
      .from('compounding_plans')
      .select('id')
      .eq('id', planId)
      .eq('user_id', user.id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan tidak ditemukan' }, { status: 404 })
    }

    // Update level status
    const achievedAt = is_achieved ? new Date().toISOString() : null

    const { data: level, error: levelErr } = await supabase
      .from('compounding_levels')
      .update({
        is_achieved: Boolean(is_achieved),
        manual_override: true,
        achieved_at: achievedAt
      })
      .eq('plan_id', planId)
      .eq('level_number', level_number)
      .select()
      .single()

    if (levelErr) throw levelErr

    return NextResponse.json({ success: true, level })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
