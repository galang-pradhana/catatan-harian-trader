import { NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

// POST /api/user/export — Generate complete user data export JSON
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Tidak terautentikasi' }, { status: 401 })
    }

    // 1. Fetch user trades
    const { data: trades } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)

    // 2. Fetch trade journals
    const { data: journals } = await supabase
      .from('trade_journal')
      .select('*')
      .eq('user_id', user.id)

    // 3. Fetch compounding plans
    const { data: compoundingPlans } = await supabase
      .from('compounding_plans')
      .select('*')
      .eq('user_id', user.id)

    // 4. Fetch psychology logs
    const { data: psychologyLogs } = await supabase
      .from('psychology_logs')
      .select('*')
      .eq('user_id', user.id)

    const exportData = {
      exported_at: new Date().toISOString(),
      user_email: user.email,
      app_version: '1.4',
      summary: {
        total_trades: (trades || []).length,
        total_journals: (journals || []).length,
        total_compounding_plans: (compoundingPlans || []).length,
        total_psychology_logs: (psychologyLogs || []).length,
      },
      data: {
        trades: trades || [],
        trade_journals: journals || [],
        compounding_plans: compoundingPlans || [],
        psychology_logs: psychologyLogs || [],
      },
    }

    // Store request in DB (optional/graceful)
    const fileName = `export_catatan_trader_${new Date().toISOString().split('T')[0]}.json`
    await supabase.from('data_export_requests').insert({
      user_id: user.id,
      status: 'ready',
      file_name: fileName,
    })

    return NextResponse.json({
      success: true,
      fileName,
      exportData,
    })
  } catch (err: any) {
    console.error('POST /api/user/export error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal membuat file ekspor data' }, { status: 500 })
  }
}

// GET /api/user/export — Fetch export history
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

    const { data: history } = await supabase
      .from('data_export_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false })

    return NextResponse.json({ success: true, history: history || [] })
  } catch (err: any) {
    console.error('GET /api/user/export error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal mengambil riwayat ekspor' }, { status: 500 })
  }
}
