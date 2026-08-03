import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify Admin Role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const plan = searchParams.get('plan')
    const status = searchParams.get('status')

    let query = supabase
      .from('users')
      .select('id, display_name, email, role, plan, status, last_active_at, created_at')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
    }
    if (plan && plan !== 'all') {
      query = query.eq('plan', plan)
    }
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: usersList, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      users: usersList || []
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
