import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const TriggerSchema = z.object({
  name: z.string().min(1, 'Nama tag pemicu tidak boleh kosong').max(100),
})

// GET /api/psychology/triggers — Fetch user custom trigger tags
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const { data: triggersData, error: dbErr } = await supabase
      .from('psychology_trigger_tags')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (dbErr && dbErr.code !== 'PGRST116') {
      console.warn('Trigger tags query warning:', dbErr.message)
    }

    return NextResponse.json({ triggers: triggersData ?? [] })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}

// POST /api/psychology/triggers — Add custom trigger tag
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = TriggerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { name } = parsed.data

    const { data: createdTag, error: insertErr } = await supabase
      .from('psychology_trigger_tags')
      .insert({
        user_id: user.id,
        name: name.trim(),
      })
      .select('*')
      .single()

    if (insertErr) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: insertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, tag: createdTag })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}
