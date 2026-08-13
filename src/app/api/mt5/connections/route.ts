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

    // Try primary query with account_type & platform columns
    let rawConnections: any[] | null = null
    let error: any = null

    const primaryRes = await supabase
      .from('mt5_connections')
      .select('id, account_number, broker_name, status, last_error, last_synced_at, created_at, current_balance, balance_updated_at, account_type, platform')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!primaryRes.error) {
      rawConnections = primaryRes.data
    } else {
      console.warn('GET /api/mt5/connections primary select warning:', primaryRes.error.message)
      const fallbackRes = await supabase
        .from('mt5_connections')
        .select('id, account_number, broker_name, status, last_error, last_synced_at, created_at, current_balance, balance_updated_at, account_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!fallbackRes.error) {
        rawConnections = fallbackRes.data
      } else {
        const legacyRes = await supabase
          .from('mt5_connections')
          .select('id, account_number, broker_name, status, last_error, last_synced_at, created_at, current_balance, balance_updated_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        if (!legacyRes.error) {
          rawConnections = legacyRes.data
        } else {
          error = legacyRes.error
        }
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
      const brokerStr = c.broker_name || 'Trading Account'
      const accType = c.account_type || 'standard'
      const platformVal = (c.platform && ['mt4', 'mt5', 'manual'].includes(String(c.platform).toLowerCase())) ? String(c.platform).toLowerCase() : 'mt5'
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
        platform: platformVal,
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

// POST /api/mt5/connections — Generate new token & create pending MT5/MT4 connection
export async function POST(request: NextRequest) {
  try {
    let accountType = 'standard'
    let platform = 'mt5'
    let brokerName = ''
    let initialBalance = 0
    try {
      const body = await request.json()
      if (body?.accountType || body?.account_type) {
        accountType = body.accountType || body.account_type
      }
      if (body?.platform) {
        const p = String(body.platform).toLowerCase()
        platform = (p === 'mt4' || p === 'manual') ? p : 'mt5'
      }
      if (body?.brokerName || body?.broker_name || body?.accountName) {
        brokerName = body.brokerName || body.broker_name || body.accountName
      }
      if (body?.initialBalance !== undefined || body?.currentBalance !== undefined || body?.balance !== undefined) {
        initialBalance = Number(body.initialBalance ?? body.currentBalance ?? body.balance ?? 0)
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
            platform,
            createdAt: new Date().toISOString(),
          },
          token: plainToken,
          message: `Token API berhasil dibuat. Salin token dan tempelkan ke EA ${platform.toUpperCase()} Anda.`,
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
          message: `Batas maksimal ${MAX_MT5_CONNECTIONS_PER_USER} koneksi trading telah tercapai. Hapus salah satu koneksi untuk membuat yang baru.`,
        },
        { status: 400 }
      )
    }

    const isManual = platform === 'manual'
    const insertPayload: any = {
      user_id: user.id,
      api_token_hash: isManual ? `manual_${user.id}_${Date.now()}` : tokenHash,
      broker_name: isManual ? (brokerName.trim() || 'Akun Trading Manual') : null,
      status: isManual ? 'connected' : 'pending',
      account_type: accountType,
      platform,
      current_balance: isManual ? initialBalance : 0,
      balance_updated_at: isManual ? new Date().toISOString() : null,
    }

    let newConn: any = null
    let insertError: any = null
    const primaryRes = await supabase
      .from('mt5_connections')
      .insert(insertPayload)
      .select('id, status, created_at, account_type, platform, current_balance, broker_name')
      .single()

    newConn = primaryRes.data
    insertError = primaryRes.error

    // Fallback if platform or account_type column does not exist in DB yet
    if (insertError) {
      console.warn('POST /api/mt5/connections insert error, retrying fallback without platform:', insertError.message)
      delete insertPayload.platform
      const retry = await supabase
        .from('mt5_connections')
        .insert(insertPayload)
        .select('id, status, created_at, account_type')
        .single()

      if (!retry.error) {
        newConn = { ...retry.data, platform }
        insertError = null
      } else {
        // Fallback without account_type as well
        delete insertPayload.account_type
        const retryLegacy = await supabase
          .from('mt5_connections')
          .insert(insertPayload)
          .select('id, status, created_at')
          .single()

        if (!retryLegacy.error) {
          newConn = { ...retryLegacy.data, account_type: accountType, platform }
          insertError = null
        }
      }
    }

    if (insertError || !newConn) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: insertError?.message || 'Gagal menyimpan koneksi trading' },
        { status: 500 }
      )
    }

    // Insert initial balance snapshot for manual connections if initialBalance > 0
    if (newConn && isManual && initialBalance > 0) {
      await supabase.from('balance_snapshots').insert({
        mt5_connection_id: newConn.id,
        balance: initialBalance,
        recorded_at: new Date().toISOString(),
      })
    }

    return NextResponse.json(
      {
        connection: {
          id: newConn.id,
          status: newConn.status,
          accountType: newConn.account_type || accountType,
          account_type: newConn.account_type || accountType,
          platform: newConn.platform || platform,
          brokerName: newConn.broker_name || (isManual ? brokerName : 'Trading Account'),
          broker_name: newConn.broker_name || (isManual ? brokerName : 'Trading Account'),
          currentBalance: isManual ? initialBalance : 0,
          current_balance: isManual ? initialBalance : 0,
          createdAt: newConn.created_at,
        },
        token: isManual ? null : plainToken,
        message: isManual
          ? `Akun manual "${brokerName || 'Trading Account'}" berhasil dibuat.`
          : `Token API berhasil dibuat. Salin token dan tempelkan ke EA ${(newConn.platform || platform).toUpperCase()} Anda.`,
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
