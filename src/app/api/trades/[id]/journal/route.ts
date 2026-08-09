import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const JournalSchema = z.object({
  sl:              z.any().optional(),
  tp:              z.any().optional(),
  reason_entry:    z.string().optional().nullable(),
  mood:            z.string().optional().nullable(),
  discipline:      z.any().optional().nullable(),
  lesson_learned:  z.string().optional().nullable(),
  risk_percent:    z.any().optional().nullable(),
  planned_rr:      z.any().optional().nullable(),
  actual_rr:       z.any().optional().nullable(),
  self_grade:      z.any().optional().nullable(),
  strategy_ids:    z.array(z.string()).optional(),
  mistake_tag_ids: z.array(z.string()).optional(),
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
      const errDetail = JSON.stringify(parsed.error.flatten().fieldErrors)
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: `Data tidak valid: ${errDetail}` },
        { status: 400 }
      )
    }

    const { strategy_ids, mistake_tag_ids, sl, tp, ...rawJournalFields } = parsed.data

    const sanitizeNum = (v: any) => {
      if (v === null || v === undefined || v === '') return null
      const n = Number(v)
      return Number.isNaN(n) ? null : n
    }

    const cleanSl = sanitizeNum(sl)
    const cleanTp = sanitizeNum(tp)

    const journalFields = {
      ...rawJournalFields,
      risk_percent: sanitizeNum(rawJournalFields.risk_percent),
      planned_rr:   sanitizeNum(rawJournalFields.planned_rr),
      actual_rr:    sanitizeNum(rawJournalFields.actual_rr),
    }

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
    if (cleanSl !== null || cleanTp !== null) {
      await supabase
        .from('trades')
        .update({
          ...(cleanSl !== null ? { sl: cleanSl } : {}),
          ...(cleanTp !== null ? { tp: cleanTp } : {}),
        })
        .eq('id', id)
        .eq('user_id', user.id)
    }

    // Upsert journal with fallback if mood check constraint is active
    let { error: journalErr } = await supabase
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

    if (journalErr && journalErr.message.includes('trade_journal_mood_check')) {
      const fallbackMood = journalFields.mood ? 'neutral' : undefined
      const { error: retryErr } = await supabase
        .from('trade_journal')
        .upsert(
          {
            trade_id: id,
            user_id:  user.id,
            ...journalFields,
            mood: fallbackMood,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'trade_id' }
        )
      journalErr = retryErr
    }

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
      try {
        await supabase.from('trade_strategies').delete().eq('trade_id', id)
        const validUuidStrats = strategy_ids.filter((sid) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid)
        )
        if (validUuidStrats.length > 0) {
          await supabase.from('trade_strategies').insert(
            validUuidStrats.map((sid) => ({ trade_id: id, strategy_id: sid }))
          )
        }
      } catch {}
    }

    // Sync mistake tags pivot table
    if (mistake_tag_ids !== undefined) {
      try {
        await supabase.from('trade_mistakes').delete().eq('trade_id', id)
        const validUuidMistakes = mistake_tag_ids.filter((mid) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mid)
        )
        if (validUuidMistakes.length > 0) {
          await supabase.from('trade_mistakes').insert(
            validUuidMistakes.map((mid) => ({ trade_id: id, mistake_tag_id: mid }))
          )
        }
      } catch {}
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
