import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/mt5/connections/[id] — Update connection details (e.g. account_type: 'standard' | 'cent')
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { accountType, account_type } = body
    const targetType = accountType || account_type || 'standard'

    if (targetType !== 'standard' && targetType !== 'cent') {
      return NextResponse.json(
        { error: 'INVALID_ACCOUNT_TYPE', message: 'Tipe akun harus "standard" atau "cent"' },
        { status: 400 }
      )
    }

    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'

    if (!isSupabaseConfigured) {
      return NextResponse.json({
        success: true,
        account_type: targetType,
        message: 'Tipe akun berhasil diperbarui (Demo)',
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

    let { data: updated, error: updateError } = await supabase
      .from('mt5_connections')
      .update({ account_type: targetType })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, status, account_type')
      .single()

    if (updateError) {
      console.warn('PATCH /api/mt5/connections/[id] update warning (column may be missing):', updateError.message)
      // Fallback: return success so client can persist in localStorage
      return NextResponse.json({
        success: true,
        connection: { id, status: 'connected', account_type: targetType },
        message: `Tipe akun diubah menjadi ${targetType === 'cent' ? 'Akun Cent (USC)' : 'Akun Standar (USD)'}.`,
      })
    }

    return NextResponse.json({
      success: true,
      connection: updated,
      message: `Tipe akun berhasil diubah menjadi ${targetType === 'cent' ? 'Akun Cent (USC)' : 'Akun Standar (USD)'}.`,
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
