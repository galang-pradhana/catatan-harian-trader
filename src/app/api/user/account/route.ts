import { NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

// DELETE /api/user/account — Delete user account (Danger Zone)
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { password } = body

    if (!password) {
      return NextResponse.json({ error: 'PASSWORD_REQUIRED', message: 'Password wajib dimasukkan untuk menghapus akun' }, { status: 400 })
    }

    // Verify user password by attempting a signInWithPassword check
    if (user.email) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: String(password),
      })

      if (signInErr) {
        return NextResponse.json({ error: 'INVALID_PASSWORD', message: 'Password yang Anda masukkan salah' }, { status: 400 })
      }
    }

    // Delete user trades, connections, and profile
    await supabase.from('trades').delete().eq('user_id', user.id)
    await supabase.from('mt5_connections').delete().eq('user_id', user.id)
    await supabase.from('users').delete().eq('id', user.id)

    // Sign out from auth
    await supabase.auth.signOut()

    return NextResponse.json({ success: true, message: 'Akun dan seluruh data Anda telah berhasil dihapus' })
  } catch (err: any) {
    console.error('DELETE /api/user/account error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal menghapus akun' }, { status: 500 })
  }
}
