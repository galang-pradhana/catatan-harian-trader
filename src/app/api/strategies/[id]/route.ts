import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const UpdateSchema = z.object({
  name:  z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
})

// PUT /api/strategies/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const parsed = UpdateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('strategies')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })

    return NextResponse.json({ strategy: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}

// DELETE /api/strategies/[id] — soft delete
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { error } = await supabase
      .from('strategies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) return NextResponse.json({ error: 'DATABASE_ERROR', message: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: String(err) }, { status: 500 })
  }
}
