import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const JournalSchema = z.object({
  sl:              z.number().nullable().optional(),
  tp:              z.number().nullable().optional(),
  reason_entry:    z.string().max(2000).optional(),
  mood:            z.string().optional(),
  discipline:      z.enum(['yes', 'no']).optional(),
  lesson_learned:  z.string().max(2000).optional(),
  risk_percent:    z.number().min(0).max(100).optional(),
  planned_rr:      z.number().min(0).optional(),
  actual_rr:       z.number().optional(),
  self_grade:      z.enum(['A', 'B', 'C', 'D', 'F']).optional(),
  strategy_ids:    z.array(z.string().uuid()).optional(),
  mistake_tag_ids: z.array(z.string().uuid()).optional(),
})

// PUT /api/trades/[id]/journal — Upsert journal for a trade
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    // Validate body
    const body = await request.json()
    const parsed = JournalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { strategy_ids, mistake_tag_ids, sl, tp, ...journalFields } = parsed.data

    // Verify trade ownership
    const { data: trade, error: tradeErr } = await supabase
      .from('trades')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (tradeErr || !trade) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Trade tidak ditemukan' },
        { status: 404 }
      )
    }

    // Update sl & tp on trades table if provided
    if (sl !== undefined || tp !== undefined) {
      await supabase
        .from('trades')
        .update({
          ...(sl !== undefined ? { sl } : {}),
          ...(tp !== undefined ? { tp } : {}),
        })
        .eq('id', id)
        .eq('user_id', user.id)
    }

    // Upsert journal
    const { error: journalErr } = await supabase
      .from('trade_journal')
      .upsert(
        {
          trade_id: id,
          user_id:  user.id,
          ...journalFields,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'trade_id' }
      )

    if (journalErr) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: journalErr.message },
        { status: 500 }
      )
    }

    // Update trade.journal_status → 'complete' if at least 1 field filled
    const hasContent = Object.values(journalFields).some(
      (v) => v !== undefined && v !== null && v !== ''
    )
    if (hasContent) {
      await supabase
        .from('trades')
        .update({ journal_status: 'complete' })
        .eq('id', id)
    }

    // Sync strategy pivot table
    if (strategy_ids !== undefined) {
      await supabase.from('trade_strategies').delete().eq('trade_id', id)
      if (strategy_ids.length > 0) {
        await supabase.from('trade_strategies').insert(
          strategy_ids.map((sid) => ({ trade_id: id, strategy_id: sid }))
        )
      }
    }

    // Sync mistake tags pivot table
    if (mistake_tag_ids !== undefined) {
      await supabase.from('trade_mistakes').delete().eq('trade_id', id)
      if (mistake_tag_ids.length > 0) {
        await supabase.from('trade_mistakes').insert(
          mistake_tag_ids.map((mid) => ({ trade_id: id, mistake_tag_id: mid }))
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Jurnal berhasil disimpan',
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}
