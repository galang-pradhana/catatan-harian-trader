import { NextRequest, NextResponse } from 'next/server'
import { hashToken } from '@/utils/token'

// POST /api/mt5/handshake — Called by EA on MT5 startup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, account_number, broker_name } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Token API wajib disertakan' },
        { status: 400 }
      )
    }

    const tokenHash = hashToken(token)

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'


    if (!isSupabaseConfigured) {
      // Demo response
      return NextResponse.json({
        success: true,
        message: 'Handshake EA berhasil (Demo Mode)',
        accountNumber: account_number ? String(account_number) : '51294821',
        brokerName: broker_name ? String(broker_name) : 'IC Markets Global',
      })
    }

    const { createClient } = await import('@/services/supabase/server')
    const supabase = await createClient()

    // 1. Find connection matching token hash
    const { data: connection, error: findError } = await supabase
      .from('mt5_connections')
      .select('id, status, user_id, account_number')
      .eq('api_token_hash', tokenHash)
      .single()

    if (findError || !connection) {
      return NextResponse.json(
        {
          error: 'MT5_INVALID_TOKEN',
          message: 'Token API MT5 tidak ditemukan atau sudah dicabut',
        },
        { status: 401 }
      )
    }

    // 2. Update status to 'connected' and fill account details
    const accNumStr = account_number ? String(account_number) : null
    const brokerStr = broker_name ? String(broker_name) : null

    const { error: updateError } = await supabase
      .from('mt5_connections')
      .update({
        status: 'connected',
        account_number: accNumStr,
        broker_name: brokerStr,
        last_error: null,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    if (updateError) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Handshake EA MetaTrader 5 berhasil. Status koneksi: Terhubung.',
      connectionId: connection.id,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
