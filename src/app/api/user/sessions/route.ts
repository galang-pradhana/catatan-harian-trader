import { NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

// GET /api/user/sessions — Fetch active user sessions
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: dbSessions, error: fetchErr } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('last_active_at', { ascending: false })

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      console.warn('GET /api/user/sessions fetch error:', fetchErr.message)
    }

    const userAgent = req.headers.get('user-agent') || 'Browser Utama (Perangkat Ini)'
    let sessions = dbSessions || []

    // Fallback: If no sessions stored in DB yet, create a default current session
    if (sessions.length === 0) {
      const currentSession = {
        id: 'current-session-id',
        user_id: user.id,
        device_info: userAgent.includes('Mobile') ? 'Mobile Browser (Perangkat Ini)' : 'Desktop Browser (Perangkat Ini)',
        ip_address: '127.0.0.1',
        last_active_at: new Date().toISOString(),
        created_at: user.created_at || new Date().toISOString(),
        is_current: true,
      }
      sessions = [currentSession]
    }

    return NextResponse.json({ success: true, sessions })
  } catch (err: any) {
    console.error('GET /api/user/sessions error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal mengambil daftar sesi' }, { status: 500 })
  }
}

// DELETE /api/user/sessions — Terminate a specific session
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

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('id')

    if (sessionId && sessionId !== 'current-session-id') {
      await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true, message: 'Sesi berhasil diakhiri' })
  } catch (err: any) {
    console.error('DELETE /api/user/sessions error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal mengakhiri sesi' }, { status: 500 })
  }
}
