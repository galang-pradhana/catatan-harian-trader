import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const SUPABASE_BUCKET = 'trade-screenshots'

function getR2Client() {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

// POST /api/trades/[id]/screenshots — Upload screenshot (Cloudflare R2 or Supabase Storage)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    // Verify trade ownership
    const { data: trade, error: tradeErr } = await supabase
      .from('trades')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (tradeErr || !trade) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Trade tidak ditemukan' },
        { status: 404 }
      )
    }

    // Parse multipart form
    const formData = await request.formData()
    const file     = formData.get('file') as File | null
    const type     = (formData.get('type') as string) || 'entry'

    if (!file) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'File screenshot wajib disertakan' },
        { status: 400 }
      )
    }

    // Validate type field
    if (!['entry', 'exit'].includes(type)) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Tipe screenshot harus "entry" atau "exit"' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'INVALID_FILE_TYPE', message: 'Format file harus JPG, PNG, atau WebP' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'FILE_TOO_LARGE', message: 'Ukuran screenshot maksimal 5 MB' },
        { status: 400 }
      )
    }

    // Build storage path: {userId}/{tradeId}/{timestamp}-{type}.{ext}
    const ext       = file.name.split('.').pop() || 'jpg'
    const timestamp = Date.now()
    const storagePath = `${user.id}/${id}/${timestamp}-${type}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = new Uint8Array(arrayBuffer)

    const r2Client = getR2Client()
    let filePublicUrl = ''

    if (r2Client) {
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'chtrader'
      const publicBaseUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://img.chtrader.web.id').replace(/\/$/, '')

      await r2Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: storagePath,
          Body: buffer,
          ContentType: file.type,
        })
      )

      filePublicUrl = `${publicBaseUrl}/${storagePath}`
    } else {
      // Fallback to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(storagePath, buffer, {
          contentType:  file.type,
          cacheControl: '3600',
          upsert:       false,
        })

      if (uploadErr) {
        return NextResponse.json(
          { error: 'UPLOAD_ERROR', message: uploadErr.message },
          { status: 500 }
        )
      }

      const { data: { publicUrl } } = supabase.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(storagePath)

      filePublicUrl = publicUrl
    }

    // Save record in DB
    const { data: screenshot, error: dbErr } = await supabase
      .from('trade_screenshots')
      .insert({
        trade_id:     id,
        user_id:      user.id,
        type,
        storage_path: storagePath,
        url:          filePublicUrl,
      })
      .select()
      .single()

    if (dbErr) {
      if (r2Client) {
        const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'chtrader'
        await r2Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: storagePath })).catch(() => {})
      } else {
        await supabase.storage.from(SUPABASE_BUCKET).remove([storagePath])
      }

      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: dbErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success:    true,
      screenshot: {
        id:          screenshot.id,
        type:        screenshot.type,
        url:         screenshot.url,
        uploaded_at: screenshot.uploaded_at,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}

// DELETE /api/trades/[id]/screenshots?screenshotId=xxx
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
    }

    const screenshotId = new URL(request.url).searchParams.get('screenshotId')
    if (!screenshotId) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'screenshotId wajib disertakan' },
        { status: 400 }
      )
    }

    const { data: shot, error: findErr } = await supabase
      .from('trade_screenshots')
      .select('id, storage_path, user_id')
      .eq('id', screenshotId)
      .eq('trade_id', id)
      .eq('user_id', user.id)
      .single()

    if (findErr || !shot) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Screenshot tidak ditemukan' }, { status: 404 })
    }

    const r2Client = getR2Client()
    if (r2Client) {
      const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'chtrader'
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: shot.storage_path,
        })
      ).catch(() => {})
    } else {
      await supabase.storage.from(SUPABASE_BUCKET).remove([shot.storage_path])
    }

    await supabase.from('trade_screenshots').delete().eq('id', screenshotId)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}
