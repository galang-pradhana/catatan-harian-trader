import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hashToken } from '@/utils/token'

// ── Zod schema for individual trade payload from EA ──────────
// Note: MT5 TimeToString() format: "2026.08.02 10:48:51" (NOT ISO 8601)
// We accept any string for datetime fields and normalize them server-side.
const TradePayloadSchema = z.object({
  mt5_ticket_id:  z.number().int().positive(),
  symbol:         z.string().min(1).max(20),
  direction:      z.enum(['buy', 'sell']),
  volume:         z.number().positive(),
  open_price:     z.number().positive(),
  close_price:    z.number().nullable().optional(),
  open_time:      z.string().min(1),  // MT5 format: "2026.08.02 10:48:51" or ISO
  close_time:     z.string().min(1).nullable().optional(),
  sl:             z.number().nullable().optional(),
  tp:             z.number().nullable().optional(),
  pnl:            z.number().nullable().optional(),
  commission:     z.number().default(0),
  swap:           z.number().default(0),
  mfe_value:      z.number().nullable().optional(),
  status:         z.enum(['open', 'closed']),
})

const SyncPayloadSchema = z.object({
  token:  z.string().min(1),
  trades: z.array(TradePayloadSchema).max(500), // safety cap
})

/**
 * Normalize MT5 TimeToString format to ISO 8601
 * Input:  "2026.08.02 10:48:51"  →  "2026-08-02T10:48:51+00:00"
 * Input:  "2026-08-02T10:48:51+00:00"  →  unchanged (already ISO)
 */
function normalizeMT5DateTime(dt: string | null | undefined): string | null {
  if (!dt) return null
  // Already ISO format
  if (dt.includes('T')) return dt
  // MT5 format: "2026.08.02 10:48:51"
  const normalized = dt.replace(/\./g, '-').replace(' ', 'T') + '+00:00'
  return normalized
}


// Detect trading session from open_time UTC hour
function detectSession(openTimeStr: string): 'asia' | 'london' | 'newyork' | null {
  const hour = new Date(openTimeStr).getUTCHours()
  if (hour >= 0 && hour < 8)   return 'asia'
  if (hour >= 8 && hour < 13)  return 'london'
  if (hour >= 13 && hour < 22) return 'newyork'
  return null
}

// POST /api/mt5/sync — Called by EA every 120 seconds
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 1. Validate payload
    const parsed = SyncPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:   'INVALID_PAYLOAD',
          message: 'Payload tidak valid',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const { token, trades } = parsed.data
    const tokenHash = hashToken(token)

    // 2. Check Supabase
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success:      true,
        synced_count: trades.length,
        message:      `Demo Mode: ${trades.length} trade diterima (tidak disimpan)`,
      })
    }

    let supabase
    try {
      const { createAdminClient } = await import('@/services/supabase/admin')
      supabase = createAdminClient()
    } catch (configErr: any) {
      console.error('[Sync] Admin client error:', configErr?.message)
      return NextResponse.json(
        {
          error: 'SERVER_MISCONFIGURED',
          message: 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.',
        },
        { status: 503 }
      )
    }

    // 3. Find connection by token hash
    // Requires SUPABASE_SERVICE_ROLE_KEY to bypass RLS (EA tidak punya user session)
    const { data: connection, error: connErr } = await supabase
      .from('mt5_connections')
      .select('id, user_id, status')
      .eq('api_token_hash', tokenHash)
      .single()

    if (connErr || !connection) {
      console.error('[Sync] Token not found. Hash:', tokenHash, 'DB Error:', connErr?.message)
      return NextResponse.json(
        { error: 'MT5_INVALID_TOKEN', message: 'Token tidak valid atau sudah dicabut' },
        { status: 401 }
      )
    }

    if (!trades.length) {
      // Update last_synced_at even with empty payload
      await supabase
        .from('mt5_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', connection.id)

      return NextResponse.json({ success: true, synced_count: 0 })
    }

    // 4. UPSERT trades (idempotent by connection + ticket)
    const rows = trades.map((t) => ({
      user_id:           connection.user_id,
      mt5_connection_id: connection.id,
      mt5_ticket_id:     t.mt5_ticket_id,
      symbol:            t.symbol.toUpperCase(),
      direction:         t.direction,
      volume:            t.volume,
      open_price:        t.open_price,
      close_price:       t.close_price ?? null,
      // Normalize MT5 datetime format "2026.08.02 10:48:51" → ISO 8601
      open_time:         normalizeMT5DateTime(t.open_time)!,
      close_time:        normalizeMT5DateTime(t.close_time ?? null),
      // EA sends 0 when no SL/TP set — treat 0 as null
      sl:                (t.sl && t.sl !== 0) ? t.sl : null,
      tp:                (t.tp && t.tp !== 0) ? t.tp : null,
      pnl:               t.pnl ?? null,
      commission:        t.commission,
      swap:              t.swap,
      status:            t.status,
      source:            'mt5_sync',
      mfe_value:         t.mfe_value ?? null,
      session:           detectSession(t.open_time),
      // journal_status defaults to 'incomplete' — do NOT overwrite if already 'complete'
    }))

    const { error: upsertErr, count } = await supabase
      .from('trades')
      .upsert(rows, {
        onConflict:        'mt5_connection_id,mt5_ticket_id',
        ignoreDuplicates:  false, // update existing rows (price/status may change for open trades)
        count:             'exact',
      })

    if (upsertErr) {
      console.error('[sync] upsert error:', upsertErr)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: upsertErr.message },
        { status: 500 }
      )
    }

    // 5. Update last_synced_at & ensure status connected
    await supabase
      .from('mt5_connections')
      .update({
        last_synced_at: new Date().toISOString(),
        status:         'connected',
        last_error:     null,
      })
      .eq('id', connection.id)

    return NextResponse.json({
      success:      true,
      synced_count: count ?? trades.length,
      message:      `${count ?? trades.length} trade berhasil disinkronkan`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}
