import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'

const BatchJournalSchema = z.object({
  trade_ids:       z.array(z.string()).min(1, 'Minimal 1 trade harus dipilih'),
  group_id:        z.string().optional(),
  group_name:      z.string().max(255).optional(),
  reason_entry:    z.string().max(2000).optional(),
  mood:            z.string().optional(),
  discipline:      z.enum(['yes', 'no']).optional(),
  lesson_learned:  z.string().max(2000).optional(),
  risk_percent:    z.number().min(0).max(100).optional(),
  planned_rr:      z.number().min(0).optional(),
  actual_rr:       z.number().optional(),
  self_grade:      z.enum(['A', 'B', 'C', 'D', 'F']).optional(),
  strategy_ids:    z.array(z.string()).optional(),
  mistake_tag_ids: z.array(z.string()).optional(),
})

// POST /api/trades/batch-journal — Batch update journal entries for multiple trades
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
    const parsed = BatchJournalSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Data batch journal tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      trade_ids,
      group_id: inputGroupId,
      group_name,
      strategy_ids,
      mistake_tag_ids,
      ...journalFields
    } = parsed.data

    // Generate unique group_id if not provided
    const groupId = inputGroupId || `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // Verify all trades belong to user
    const { data: userTrades, error: fetchErr } = await supabase
      .from('trades')
      .select('id')
      .in('id', trade_ids)
      .eq('user_id', user.id)

    if (fetchErr || !userTrades || userTrades.length === 0) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Trade yang dipilih tidak ditemukan' },
        { status: 404 }
      )
    }

    const validTradeIds = userTrades.map((t) => t.id)

    // Batch upsert trade_journal entries
    const journalRows = validTradeIds.map((id) => ({
      trade_id:     id,
      user_id:      user.id,
      group_id:     groupId,
      group_name:   group_name || null,
      ...journalFields,
      updated_at:   new Date().toISOString(),
    }))

    let { error: upsertErr } = await supabase
      .from('trade_journal')
      .upsert(journalRows, { onConflict: 'trade_id' })

    if (upsertErr && upsertErr.message.includes('trade_journal_mood_check')) {
      const fallbackRows = journalRows.map((r) => ({
        ...r,
        mood: r.mood ? 'neutral' : undefined,
      }))
      const { error: retryErr } = await supabase
        .from('trade_journal')
        .upsert(fallbackRows, { onConflict: 'trade_id' })
      upsertErr = retryErr
    }

    if (upsertErr) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: upsertErr.message },
        { status: 500 }
      )
    }

    // Update journal_status to 'complete' for all target trades
    await supabase
      .from('trades')
      .update({ journal_status: 'complete' })
      .in('id', validTradeIds)
      .eq('user_id', user.id)

    // Sync strategies pivot table per trade
    if (strategy_ids !== undefined) {
      const validUuidStrats = strategy_ids.filter((sid) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sid)
      )
      for (const id of validTradeIds) {
        try {
          await supabase.from('trade_strategies').delete().eq('trade_id', id)
          if (validUuidStrats.length > 0) {
            await supabase.from('trade_strategies').insert(
              validUuidStrats.map((sid) => ({ trade_id: id, strategy_id: sid }))
            )
          }
        } catch {}
      }
    }

    // Sync mistake tags pivot table per trade
    if (mistake_tag_ids !== undefined) {
      const validUuidMistakes = mistake_tag_ids.filter((mid) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mid)
      )
      for (const id of validTradeIds) {
        try {
          await supabase.from('trade_mistakes').delete().eq('trade_id', id)
          if (validUuidMistakes.length > 0) {
            await supabase.from('trade_mistakes').insert(
              validUuidMistakes.map((mid) => ({ trade_id: id, mistake_tag_id: mid }))
            )
          }
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memperbarui jurnal untuk ${validTradeIds.length} trade`,
      group_id: groupId,
      updated_count: validTradeIds.length,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}
