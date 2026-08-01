import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const TagSchema = z.object({
  name:  z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#EF4444'),
})

// GET /api/mistake-tags
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { data, error } = await supabase
      .from('mistake_tags')
      .select('id, name, color, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    return NextResponse.json({ mistake_tags: data ?? [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}

// POST /api/mistake-tags
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const parsed = TagSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('mistake_tags')
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    return NextResponse.json({ mistake_tag: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}
