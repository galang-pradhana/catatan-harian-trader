import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const TagSchema = z.object({
  name:  z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#EF4444'),
})

// GET /api/mistake-tags — List user's mistake tags with usage count
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { data, error } = await supabase
      .from('mistake_tags')
      .select('id, name, color, created_at, trade_mistakes(count)')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    const formatted = (data ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      created_at: t.created_at,
      usage_count: Array.isArray(t.trade_mistakes) && t.trade_mistakes.length > 0 ? t.trade_mistakes[0].count : 0,
    }))

    return NextResponse.json({ mistake_tags: formatted })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}

// POST /api/mistake-tags — Create new mistake tag with duplicate check
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const body = await request.json()
    const parsed = TagSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, color } = parsed.data
    const trimName = name.trim()

    // Case-insensitive duplicate check among active mistake tags for user
    const { data: existing } = await supabase
      .from('mistake_tags')
      .select('id, name')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .ilike('name', trimName)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'DUPLICATE_NAME', message: `Tag kesalahan dengan nama "${trimName}" sudah ada.` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('mistake_tags')
      .insert({ name: trimName, color, user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    return NextResponse.json({ mistake_tag: { ...data, usage_count: 0 } }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}
