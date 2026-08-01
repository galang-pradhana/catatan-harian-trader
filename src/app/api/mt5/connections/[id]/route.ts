import { NextRequest, NextResponse } from 'next/server'

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
