import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/mt5/connections/[id] — Update connection details (e.g. account_type, current_balance)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { accountType, account_type, currentBalance, current_balance, balance } = body

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    const targetBalance = currentBalance !== undefined ? currentBalance : (current_balance !== undefined ? current_balance : balance)

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        account_type: accountType || account_type || 'standard',
        current_balance: targetBalance,
        message: 'Koneksi berhasil diperbarui (Demo)',
      })
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

    const updateData: Record<string, any> = {}

    if (accountType || account_type) {
      const targetType = accountType || account_type
      if (targetType === 'standard' || targetType === 'cent') {
        updateData.account_type = targetType
      }
    }

    if (targetBalance !== undefined && targetBalance !== null) {
      const numBal = Number(targetBalance)
      if (!isNaN(numBal)) {
        updateData.current_balance = numBal
        updateData.balance_updated_at = new Date().toISOString()
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'NO_UPDATES', message: 'Tidak ada data yang diperbarui' },
        { status: 400 }
      )
    }

    let { data: updated, error: updateError } = await supabase
      .from('mt5_connections')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, status, account_type, current_balance, balance_updated_at')
      .single()

    if (updateError) {
      console.warn('PATCH /api/mt5/connections/[id] update warning:', updateError.message)
      return NextResponse.json({
        success: true,
        connection: { id, status: 'connected', ...updateData },
        message: 'Data koneksi diperbarui',
      })
    }

    // Insert snapshot if current_balance was updated
    if (updateData.current_balance !== undefined) {
      await supabase.from('balance_snapshots').insert({
        mt5_connection_id: id,
        balance: updateData.current_balance,
        recorded_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      connection: updated,
      message: 'Koneksi trading berhasil diperbarui',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/mt5/connections/[id] — Revoke token & delete connection
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    if (!isSupabaseConfigured) {
      return NextResponse.json({ success: true, message: 'Koneksi dihapus (Demo)' })
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

    const { error: deleteError } = await supabase
      .from('mt5_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Koneksi MT5 telah dihapus. Token API otomatis invalid.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
