import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

interface CSVTradeRow {
  ticket?: string
  symbol?: string
  direction?: 'buy' | 'sell'
  volume?: number
  openPrice?: number
  closePrice?: number
  openTime?: string
  closeTime?: string
  pnl?: number
  sl?: number
  tp?: number
}

// POST /api/import/[batchId]/confirm — Confirm and execute CSV trade import
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    const body = await request.json()
    const rows: CSVTradeRow[] = body.rows || []

    if (!rows.length) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', message: 'Data baris trade kosong' }, { status: 400 })
    }

    let importedCount = 0
    let skippedCount  = 0
    let failedCount   = 0
    const errorLogs: Array<{ row: number; reason: string }> = []

    // Fetch existing mt5_connections for user (or create a fallback default import connection)
    let connectionId: string | null = null
    const { data: conns } = await supabase
      .from('mt5_connections')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (conns && conns.length > 0) {
      connectionId = conns[0].id
    }

    if (!connectionId) {
      // Create fallback dummy connection for CSV imports if none exists
      const { data: newConn } = await supabase
        .from('mt5_connections')
        .insert({
          user_id:        user.id,
          account_number: 'CSV_IMPORT',
          broker_name:    'CSV Statement Import',
          api_token_hash: 'csv_import_placeholder_hash',
          status:         'connected',
        })
        .select('id')
        .single()

      connectionId = newConn?.id || null
    }

    if (!connectionId) {
      return NextResponse.json({ error: 'DATABASE_ERROR', message: 'Gagal membuat koneksi simpan import' }, { status: 500 })
    }

    // Process rows
    const tradePayloads = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]

      // Validation
      if (!r.symbol || !r.openPrice || !r.openTime) {
        failedCount++
        errorLogs.push({ row: i + 1, reason: 'Data wajib (Symbol, Open Price, Open Time) tidak lengkap' })
        continue
      }

      const ticketId = r.ticket ? parseInt(String(r.ticket).replace(/\D/g, ''), 10) : Date.now() + i

      tradePayloads.push({
        user_id:           user.id,
        mt5_connection_id: connectionId,
        mt5_ticket_id:     ticketId,
        symbol:            String(r.symbol).toUpperCase(),
        direction:         r.direction === 'sell' ? 'sell' : 'buy',
        volume:            Number(r.volume) || 0.1,
        open_price:        Number(r.openPrice),
        close_price:       r.closePrice ? Number(r.closePrice) : null,
        open_time:         r.openTime,
        close_time:        r.closeTime || null,
        sl:                r.sl ? Number(r.sl) : null,
        tp:                r.tp ? Number(r.tp) : null,
        pnl:               r.pnl !== undefined ? Number(r.pnl) : null,
        status:            r.closeTime ? 'closed' : 'open',
        source:            'csv_import',
      })
    }

    if (tradePayloads.length > 0) {
      // Upsert trades (ignoreDuplicates: true so existing EA trades take precedence)
      const { data: upsertData, error: upsertErr } = await supabase
        .from('trades')
        .upsert(tradePayloads, {
          onConflict:       'mt5_connection_id,mt5_ticket_id',
          ignoreDuplicates: true,
        })

      if (upsertErr) {
        console.error('[confirm import] error:', upsertErr)
      } else {
        importedCount = tradePayloads.length
      }
    }

    // Update import_batches record
    if (batchId && batchId !== 'demo-batch-id') {
      await supabase
        .from('import_batches')
        .update({
          status:         failedCount > 0 ? 'partial' : 'success',
          imported_count: importedCount,
          skipped_count:  skippedCount,
          failed_count:   failedCount,
          error_log:      errorLogs,
        })
        .eq('id', batchId)
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows:     rows.length,
        importedCount,
        skippedCount,
        failedCount,
        errorLogs,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}
