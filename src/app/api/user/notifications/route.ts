import { NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

const DEFAULT_NOTIF_PREFS = {
  channel_email: true,
  channel_push: false,
  channel_telegram: false,
  alert_sync_error: true,
  alert_order_execution: true,
  alert_compounding_goal: true,
  alert_journal_reminder: true,
  alert_ai_analysis_done: true,
}

// GET /api/user/notifications — Fetch notification preferences
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }, { status: 401 })
    }

    const { data: prefs, error: fetchErr } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchErr && fetchErr.code !== 'PGRST116') {
      console.warn('GET /api/user/notifications fetch error:', fetchErr.message)
    }

    return NextResponse.json({
      success: true,
      preferences: prefs || { user_id: user.id, ...DEFAULT_NOTIF_PREFS },
    })
  } catch (err: any) {
    console.error('GET /api/user/notifications error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal mengambil preferensi notifikasi' }, { status: 500 })
  }
}

// PATCH /api/user/notifications — Update notification preferences
export async function PATCH(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }, { status: 401 })
    }

    const body = await req.json()
    const payload = {
      user_id: user.id,
      channel_email: body.channel_email ?? true,
      channel_push: body.channel_push ?? false,
      channel_telegram: body.channel_telegram ?? false,
      alert_sync_error: body.alert_sync_error ?? true,
      alert_order_execution: body.alert_order_execution ?? true,
      alert_compounding_goal: body.alert_compounding_goal ?? true,
      alert_journal_reminder: body.alert_journal_reminder ?? true,
      alert_ai_analysis_done: body.alert_ai_analysis_done ?? true,
      updated_at: new Date().toISOString(),
    }

    const { error: upsertErr } = await supabase
      .from('notification_preferences')
      .upsert(payload, { onConflict: 'user_id' })

    if (upsertErr) {
      console.warn('PATCH /api/user/notifications upsert warning:', upsertErr.message)
    }

    return NextResponse.json({
      success: true,
      preferences: payload,
      message: 'Preferensi notifikasi berhasil disimpan',
    })
  } catch (err: any) {
    console.error('PATCH /api/user/notifications error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal menyimpan preferensi notifikasi' }, { status: 500 })
  }
}
