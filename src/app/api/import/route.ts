import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { createClient } from '@/services/supabase/server'

// POST /api/import — Parse CSV file and return column mapping preview
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', message: 'File CSV wajib diunggah' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'IMPORT_FILE_TOO_LARGE', message: 'Ukuran file maksimal 10 MB' }, { status: 400 })
    }

    const text = await file.text()
    const parseResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    })

    if (parseResult.errors.length && !parseResult.data.length) {
      return NextResponse.json({ error: 'IMPORT_FILE_INVALID', message: 'Format file CSV tidak dapat diparse' }, { status: 400 })
    }

    const headers = parseResult.meta.fields || []
    const previewRows = parseResult.data.slice(0, 5)

    // Create import_batches record
    const { data: batch, error: batchErr } = await supabase
      .from('import_batches')
      .insert({
        user_id:    user.id,
        file_name:  file.name,
        status:     'processing',
        total_rows: parseResult.data.length,
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      batchId: batch?.id || 'demo-batch-id',
      totalRows: parseResult.data.length,
      headers,
      previewRows,
      rows: parseResult.data,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}
