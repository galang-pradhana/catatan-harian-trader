import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetUserId } = await params
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify Admin Role
    const { data: adminRoleData } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (adminRoleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Prevent Admin from suspending or deleting self
    if (targetUserId === adminUser.id) {
      return NextResponse.json(
        { error: 'ADMIN_SELF_ACTION_BLOCKED: Admin tidak dapat mengubah status akun sendiri' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { action, newPlan, newStatus, adminPassword } = body

    if (!action) {
      return NextResponse.json({ error: 'Action type is required' }, { status: 400 })
    }

    if (action === 'delete') {
      if (!adminPassword) {
        return NextResponse.json(
          { error: 'ADMIN_REAUTH_REQUIRED: Password admin diperlukan' },
          { status: 400 }
        )
      }

      // Execute deletion
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', targetUserId)

      if (deleteError) throw deleteError

      // Record Audit Log
      await supabase.from('admin_audit_log').insert({
        admin_user_id: adminUser.id,
        action: 'delete_user',
        target_user_id: targetUserId,
        details: { note: 'User deleted by admin' }
      })

      return NextResponse.json({ success: true, message: 'User deleted successfully' })
    }

    if (action === 'suspend') {
      const { error: updateError } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', targetUserId)

      if (updateError) throw updateError

      // Record Audit Log
      await supabase.from('admin_audit_log').insert({
        admin_user_id: adminUser.id,
        action: 'suspend_user',
        target_user_id: targetUserId,
        details: { newStatus }
      })

      return NextResponse.json({ success: true, message: `User status changed to ${newStatus}` })
    }

    if (action === 'change_plan') {
      const { error: updateError } = await supabase
        .from('users')
        .update({ plan: newPlan })
        .eq('id', targetUserId)

      if (updateError) throw updateError

      // Record Audit Log
      await supabase.from('admin_audit_log').insert({
        admin_user_id: adminUser.id,
        action: 'change_plan',
        target_user_id: targetUserId,
        details: { newPlan }
      })

      return NextResponse.json({ success: true, message: `User plan changed to ${newPlan}` })
    }

    return NextResponse.json({ error: 'Invalid action type' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
