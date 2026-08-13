import { NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

// GET /api/user/settings — Fetch user profile, settings & connection summary
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

    // 1. Fetch profile from public.users
    const { data: profile } = await supabase
      .from('users')
      .select('display_name, theme, timezone, two_factor_enabled, dashboard_default_period, number_format, membership_tier, created_at')
      .eq('id', user.id)
      .maybeSingle()

    // 2. Fetch connections summary
    const { data: connections } = await supabase
      .from('mt5_connections')
      .select('id, platform, execution_enabled')
      .eq('user_id', user.id)

    const connList = connections || []
    const totalConnections = connList.length
    const mt5Count = connList.filter((c: any) => c.platform !== 'manual').length
    const manualCount = connList.filter((c: any) => c.platform === 'manual').length
    const executionEnabledCount = connList.filter((c: any) => c.execution_enabled === true).length

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: profile?.display_name || user.email?.split('@')[0] || 'Pro Trader',
        theme: profile?.theme || 'dark',
        timezone: profile?.timezone || 'Asia/Jakarta',
        twoFactorEnabled: profile?.two_factor_enabled ?? false,
        dashboardDefaultPeriod: profile?.dashboard_default_period || 'month',
        numberFormat: profile?.number_format || 'en',
        membershipTier: profile?.membership_tier || 'free',
        createdAt: profile?.created_at || user.created_at,
      },
      connectionsSummary: {
        used: totalConnections,
        max: 3,
        mt5Count,
        manualCount,
        executionEnabledCount,
      },
    })
  } catch (err: any) {
    console.error('GET /api/user/settings error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal mengambil pengaturan' }, { status: 500 })
  }
}

// PATCH /api/user/settings — Update user settings
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
    const { displayName, timezone, twoFactorEnabled, dashboardDefaultPeriod, numberFormat, theme } = body

    const updatePayload: Record<string, any> = {}
    if (displayName !== undefined) updatePayload.display_name = String(displayName).trim()
    if (timezone !== undefined) updatePayload.timezone = String(timezone)
    if (twoFactorEnabled !== undefined) updatePayload.two_factor_enabled = Boolean(twoFactorEnabled)
    if (dashboardDefaultPeriod !== undefined) updatePayload.dashboard_default_period = String(dashboardDefaultPeriod)
    if (numberFormat !== undefined) updatePayload.number_format = String(numberFormat)
    if (theme !== undefined) updatePayload.theme = String(theme)

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id)

      if (updateError) {
        console.warn('PATCH /api/user/settings update error:', updateError.message)
      }

      // Also update auth user_metadata if displayName changed
      if (displayName) {
        await supabase.auth.updateUser({
          data: { display_name: String(displayName).trim() },
        })
      }
    }

    return NextResponse.json({ success: true, message: 'Pengaturan berhasil diperbarui' })
  } catch (err: any) {
    console.error('PATCH /api/user/settings error:', err)
    return NextResponse.json({ error: 'SERVER_ERROR', message: 'Gagal memperbarui pengaturan' }, { status: 500 })
  }
}
