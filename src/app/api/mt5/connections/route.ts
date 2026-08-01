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
      // Demo fallback response
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

    const { data: connections, error } = await supabase
      .from('mt5_connections')
      .select('id, account_number, broker_name, status, last_error, last_synced_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: error.message },
        { status: 500 }
      )
    }

    // Format DB columns (snake_case) to camelCase frontend interface
    const formatted = (connections || []).map((c: any) => ({
      id: c.id,
      accountNumber: c.account_number,
      brokerName: c.broker_name,
      status: c.status,
      lastError: c.last_error,
      lastSyncedAt: c.last_synced_at,
      createdAt: c.created_at,
    }))

    return NextResponse.json({ connections: formatted })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/mt5/connections — Generate new token & create pending MT5 connection
export async function POST(request: NextRequest) {
  try {
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    // Generate fresh plain token and hash it
    const plainToken = generateToken()
    const tokenHash = hashToken(plainToken)

    if (!isSupabaseConfigured) {
      // Demo response when Supabase is not configured yet
      return NextResponse.json(
        {
          connection: {
            id: `conn-${Date.now()}`,
            status: 'pending',
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

    // 1. Check MAX_MT5_CONNECTIONS_PER_USER (Max 3 connections limit)
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

    // 2. Insert new pending connection with hashed token
    const { data: newConn, error: insertError } = await supabase
      .from('mt5_connections')
      .insert({
        user_id: user.id,
        api_token_hash: tokenHash,
        status: 'pending',
      })
      .select('id, status, created_at')
      .single()

    if (insertError) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        connection: {
          id: newConn.id,
          status: newConn.status,
          createdAt: newConn.created_at,
        },
        token: plainToken, // Returned ONLY ONCE
        message: 'Token API berhasil dibuat. Salin token dan tempelkan ke EA MT5 Anda.',
      },
      { status: 201 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
