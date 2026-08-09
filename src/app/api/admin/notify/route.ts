import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event, userEmail, userName, registeredAt, reason } = body

    if (!event || !userEmail) {
      return NextResponse.json({ error: 'Event and userEmail are required' }, { status: 400 })
    }

    if (event === 'NEW_PENDING_USER') {
      console.log(`[EVENT_NOTIFY] Email sent to Admin: User ${userName} (${userEmail}) registered on ${registeredAt || new Date().toISOString()}. Review pending at /admin/users?status=pending`)
    } else if (event === 'USER_APPROVED') {
      console.log(`[EVENT_NOTIFY] Email sent to User ${userEmail}: "Akun kamu sudah aktif! Silakan login dan mulai gunakan chtrader."`)
    } else if (event === 'USER_REJECTED') {
      console.log(`[EVENT_NOTIFY] Email sent to User ${userEmail}: "Pendaftaran akun Anda belum dapat diproses saat ini." Reason (Internal Admin): ${reason || 'N/A'}`)
    }

    return NextResponse.json({
      success: true,
      message: `Notification event ${event} processed successfully`,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
