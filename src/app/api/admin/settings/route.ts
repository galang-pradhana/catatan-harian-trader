import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { getAdminSettings, saveAdminSettings } from '@/utils/admin-settings-storage'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role === 'admin') {
        const { data: dbSettings } = await supabase
          .from('admin_settings')
          .select('key, value')
          .eq('key', 'require_admin_approval')
          .single()

        if (dbSettings) {
          saveAdminSettings({ requireAdminApproval: dbSettings.value === 'true' })
        }
      }
    }

    const current = getAdminSettings()
    return NextResponse.json({ success: true, settings: current })
  } catch (err: any) {
    const current = getAdminSettings()
    return NextResponse.json({ success: true, settings: current })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { requireAdminApproval } = body

    if (typeof requireAdminApproval === 'boolean') {
      saveAdminSettings({ requireAdminApproval })

      // Persist to Supabase if table exists
      try {
        await supabase
          .from('admin_settings')
          .upsert({ key: 'require_admin_approval', value: String(requireAdminApproval) })
      } catch {
        // Fallback to in-memory/localStorage
      }

      // Record Audit Log
      try {
        await supabase.from('admin_audit_log').insert({
          admin_user_id: user.id,
          action: 'update_settings',
          details: { requireAdminApproval }
        })
      } catch {
        // Fallback
      }
    }

    const updated = getAdminSettings()
    return NextResponse.json({ success: true, settings: updated })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
