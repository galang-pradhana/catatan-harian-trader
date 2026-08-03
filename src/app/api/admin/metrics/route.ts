import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if current user has admin role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Fetch aggregate statistics
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: activeUsers7d } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_active_at', sevenDaysAgo)

    const { count: totalMt5Connections } = await supabase
      .from('mt5_connections')
      .select('*', { count: 'exact', head: true })

    const { count: errorMt5Connections } = await supabase
      .from('mt5_connections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'error')

    const { count: totalTradesSynced } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })

    const { count: freeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'free')

    const { count: premiumUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'premium')

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers: totalUsers || 0,
        activeUsers7d: activeUsers7d || 0,
        totalMt5Connections: totalMt5Connections || 0,
        errorMt5Connections: errorMt5Connections || 0,
        totalTradesSynced: totalTradesSynced || 0,
        freeUsers: freeUsers || 0,
        premiumUsers: premiumUsers || 0,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
