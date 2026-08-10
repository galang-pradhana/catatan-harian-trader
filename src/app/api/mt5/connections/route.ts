import { NextRequest, NextResponse } from 'next/server'
import { generateToken, hashToken } from '@/utils/token'
import { MAX_MT5_CONNECTIONS_PER_USER } from '@/constants/mt5'

// GET /api/mt5/connections — List user's MT5 connections
export async function GET(request: NextRequest) {
  try {
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    if (!isSupabaseConfigured) {
      const { DUMMY_MT5_CONNECTIONS } = await import('@/constants/dummy-mt5')
      return NextResponse.json({ connections: DUMMY_MT5_CONNECTIONS })
    }

    const { createClient } = await import('@/services/supabase/server')
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Anda harus masuk terlebih dahulu' },
        { status: 401 }
      )
    }

    // Try primary query with account_type column
    let rawConnections: any[] | null = null
    let error: any = null

    const primaryRes = await supabase
      .from('mt5_connections')
      .select('id, account_number, broker_name, status, last_error, last_synced_at, created_at, current_balance, balance_updated_at, account_type')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!primaryRes.error) {
      rawConnections = primaryRes.data
    } else {
      console.warn('GET /api/mt5/connections primary select warning:', primaryRes.error.message)
      const fallbackRes = await supabase
        .from('mt5_connections')
        .select('id, account_number, broker_name, status, last_error, last_synced_at, created_at, current_balance, balance_updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!fallbackRes.error) {
        rawConnections = fallbackRes.data
      } else {
        error = fallbackRes.error
      }
    }

    if (error) {
      console.error('GET /api/mt5/connections error:', error.message)
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: error.message },
        { status: 500 }
      )
    }

    // Fetch closed trade PnL sums per connection as fallback if balance is not updated yet
    const { data: closedTrades } = await supabase
      .from('trades')
      .select('mt5_connection_id, pnl')
      .eq('user_id', user.id)
      .eq('status', 'closed')

    const pnlMap = new Map<string, number>()
    if (closedTrades && Array.isArray(closedTrades)) {
      closedTrades.forEach((t: any) => {
        if (t.mt5_connection_id) {
          const current = pnlMap.get(t.mt5_connection_id) || 0
          pnlMap.set(t.mt5_connection_id, current + Number(t.pnl || 0))
        }
      })
    }

    // Format DB columns for both camelCase and snake_case compatibility
    const formatted = (rawConnections || []).map((c: any) => {
      const dbBal = c.current_balance !== null && c.current_balance !== undefined ? Number(c.current_balance) : null
      const tradePnlSum = pnlMap.get(c.id) || 0
      
      const effectiveBalance = dbBal !== null && dbBal > 0 ? dbBal : (tradePnlSum !== 0 ? tradePnlSum : (dbBal || 0))
      const accNumStr = c.account_number ? String(c.account_number) : ''
      const brokerStr = c.broker_name || 'MT5 Account'
      const accType = c.account_type || 'standard'
      const balanceUsd = accType === 'cent' ? effectiveBalance / 100 : effectiveBalance

      return {
        id: c.id,
        accountNumber: accNumStr,
        account_number: accNumStr,
        brokerName: brokerStr,
        broker_name: brokerStr,
        name: accNumStr ? `${brokerStr} (#${accNumStr})` : brokerStr,
        status: c.status,
        lastError: c.last_error,
        lastSyncedAt: c.last_synced_at,
        createdAt: c.created_at,
        accountType: accType,
        account_type: accType,
        currentBalance: effectiveBalance,
        current_balance: effectiveBalance,
        balance: effectiveBalance,
        balanceUsd,
        balance_usd: balanceUsd,
        balanceUpdatedAt: c.balance_updated_at,
      }
    })

    return NextResponse.json({ connections: formatted })
  } catch (err: any) {
    console.error('GET /api/mt5/connections unexpected error:', err)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/mt5/connections — Generate new token & create pending MT5 connection
export async function POST(request: NextRequest) {
  try {
    let accountType = 'standard'
    try {
      const body = await request.json()
      if (body?.accountType || body?.account_type) {
        accountType = body.accountType || body.account_type
      }
    } catch {
      // Body optional
    }

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    const plainToken = generateToken()
    const tokenHash = hashToken(plainToken)

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          connection: {
            id: `conn-${Date.now()}`,
            status: 'pending',
            accountType,
            account_type: accountType,
            createdAt: new Date().toISOString(),
          },
          token: plainToken,
          message: 'Token API berhasil dibuat. Salin token dan tempelkan ke EA MT5 Anda.',
        },
        { status: 201 }
      )
    }

    const { createClient } = await import('@/services/supabase/server')
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Anda harus masuk terlebih dahulu' },
        { status: 401 }
      )
    }

    const { count, error: countError } = await supabase
      .from('mt5_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: countError.message },
        { status: 500 }
      )
    }

    if ((count || 0) >= MAX_MT5_CONNECTIONS_PER_USER) {
      return NextResponse.json(
        {
          error: 'MT5_CONNECTION_LIMIT_REACHED',
          message: `Batas maksimal ${MAX_MT5_CONNECTIONS_PER_USER} koneksi MT5 telah tercapai. Hapus salah satu koneksi untuk membuat yang baru.`,
        },
        { status: 400 }
      )
    }

    const insertPayload: any = {
      user_id: user.id,
      api_token_hash: tokenHash,
      status: 'pending',
      account_type: accountType,
    }

    let { data: newConn, error: insertError } = await supabase
      .from('mt5_connections')
      .insert(insertPayload)
      .select('id, status, created_at, account_type')
      .single()

    // Fallback if account_type column does not exist in DB yet
    if (insertError) {
      console.warn('POST /api/mt5/connections insert error, retrying fallback:', insertError.message)
      delete insertPayload.account_type
      const retry = await supabase
        .from('mt5_connections')
        .insert(insertPayload)
        .select('id, status, created_at')
        .single()

      if (!retry.error) {
        newConn = { ...retry.data, account_type: accountType }
        insertError = null
      }
    }

    if (insertError || !newConn) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: insertError?.message || 'Gagal menyimpan koneksi MT5' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        connection: {
          id: newConn.id,
          status: newConn.status,
          accountType: newConn.account_type || accountType,
          account_type: newConn.account_type || accountType,
          createdAt: newConn.created_at,
        },
        token: plainToken,
        message: 'Token API berhasil dibuat. Salin token dan tempelkan ke EA MT5 Anda.',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('POST /api/mt5/connections unexpected error:', err)
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
