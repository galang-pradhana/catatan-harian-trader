import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const StrategySchema = z.object({
  name:  z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#D4A94C'),
})

// GET /api/strategies — List user's strategies with usage count
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { data, error } = await supabase
      .from('strategies')
      .select('id, name, color, created_at, trade_strategies(count)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    const formatted = (data ?? []).map((s: any) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      created_at: s.created_at,
      usage_count: Array.isArray(s.trade_strategies) && s.trade_strategies.length > 0 ? s.trade_strategies[0].count : 0,
    }))

    return NextResponse.json({ strategies: formatted })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}

// POST /api/strategies — Create new strategy with duplicate check
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const body = await request.json()
    const parsed = StrategySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, color } = parsed.data
    const trimName = name.trim()

    // Case-insensitive duplicate check among active strategies for user
    const { data: existing } = await supabase
      .from('strategies')
      .select('id, name')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .ilike('name', trimName)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'DUPLICATE_NAME', message: `Strategi dengan nama "${trimName}" sudah ada.` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('strategies')
      .insert({ name: trimName, color, user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    return NextResponse.json({ strategy: { ...data, usage_count: 0 } }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}
