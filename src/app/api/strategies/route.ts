import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const StrategySchema = z.object({
  name:  z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#D4A94C'),
})

// GET /api/strategies — List user's strategies
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { data, error } = await supabase
      .from('strategies')
      .select('id, name, color, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    return NextResponse.json({ strategies: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}

// POST /api/strategies — Create new strategy
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

    const { data, error } = await supabase
      .from('strategies')
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    return NextResponse.json({ strategy: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}
