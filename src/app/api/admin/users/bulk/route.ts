import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { createAdminClient } from '@/services/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: adminUser } } = await supabase.auth.getUser()

    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminRoleData } = await supabase
      .from('users')
      .select('role')
      .eq('id', adminUser.id)
      .single()

    if (adminRoleData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, userIds, reason } = body

    if (!action || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Action and non-empty userIds array are required' }, { status: 400 })
    }

    let dbClient: any = supabase
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        dbClient = createAdminClient()
      }
    } catch {
      dbClient = supabase
    }

    if (action === 'approve_bulk') {
      const { error: updateError } = await dbClient
        .from('users')
        .update({ status: 'active' })
        .in('id', userIds)

      if (updateError) throw updateError

      // Record Audit Logs
      try {
        const auditEntries = userIds.map((id: string) => ({
          admin_user_id: adminUser.id,
          action: 'APPROVE_USER',
          target_user_id: id,
          details: { note: 'Bulk approved by admin' },
        }))
        await dbClient.from('admin_audit_log').insert(auditEntries)
      } catch {}

      return NextResponse.json({
        success: true,
        message: `${userIds.length} users approved successfully`,
      })
    }

    if (action === 'reject_bulk') {
      const { error: updateError } = await dbClient
        .from('users')
        .update({ status: 'rejected' })
        .in('id', userIds)

      if (updateError) throw updateError

      // Record Audit Logs
      try {
        const auditEntries = userIds.map((id: string) => ({
          admin_user_id: adminUser.id,
          action: 'REJECT_USER',
          target_user_id: id,
          details: { note: 'Bulk rejected by admin', reason: reason || 'N/A' },
        }))
        await dbClient.from('admin_audit_log').insert(auditEntries)
      } catch {}

      return NextResponse.json({
        success: true,
        message: `${userIds.length} users rejected successfully`,
      })
    }

    return NextResponse.json({ error: 'Invalid action type' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
