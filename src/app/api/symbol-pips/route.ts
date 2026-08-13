import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/services/supabase/server'
import { getDefaultPipConfig, calculatePipsGained } from '@/utils/pip-calculator'

// GET /api/symbol-pips — List all symbol pip configs for user, combined with traded symbols
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    // 1. Fetch saved symbol pip configs
    const { data: savedConfigs, error: cfgErr } = await supabase
      .from('symbol_pip_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('symbol', { ascending: true })

    if (cfgErr) {
      return NextResponse.json({ error: 'DATABASE_ERROR', message: cfgErr.message }, { status: 500 })
    }

    // 2. Fetch distinct symbols traded by user
    const { data: userTrades } = await supabase
      .from('trades')
      .select('symbol')
      .eq('user_id', user.id)

    const tradedSymbols = Array.from(new Set((userTrades || []).map((t) => t.symbol.toUpperCase())))

    const configMap = new Map<string, any>()
    for (const cfg of savedConfigs || []) {
      configMap.set(cfg.symbol.toUpperCase(), cfg)
    }

    // 3. Auto-populate traded symbols missing from configMap
    const resultList = [...(savedConfigs || [])]

    for (const sym of tradedSymbols) {
      if (!configMap.has(sym)) {
        const defConfig = getDefaultPipConfig(sym)
        resultList.push({
          id: null,
          user_id: user.id,
          symbol: sym,
          pip_size: defConfig?.pip_size ?? null,
          is_confirmed: false,
          updated_at: null,
        })
      }
    }

    // Sort alphabetically
    resultList.sort((a, b) => a.symbol.localeCompare(b.symbol))

    return NextResponse.json({ configs: resultList })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}

// POST /api/symbol-pips — Update / Confirm symbol pip_size and optionally recalculate past trades
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { symbol, pip_size, is_confirmed = true, recalculate_past = false } = body

    if (!symbol || pip_size === undefined || pip_size === null || isNaN(Number(pip_size)) || Number(pip_size) <= 0) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Simbol dan Pip Size harus diisi dengan angka positif' },
        { status: 400 }
      )
    }

    const uppercaseSymbol = String(symbol).toUpperCase().trim()
    const numPipSize = Number(pip_size)
    const boolConfirmed = Boolean(is_confirmed)

    // 1. Upsert into symbol_pip_configs
    const { data: updatedConfig, error: upsertErr } = await supabase
      .from('symbol_pip_configs')
      .upsert(
        {
          user_id: user.id,
          symbol: uppercaseSymbol,
          pip_size: numPipSize,
          is_confirmed: boolConfirmed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,symbol' }
      )
      .select('*')
      .single()

    if (upsertErr) {
      return NextResponse.json({ error: 'DATABASE_ERROR', message: upsertErr.message }, { status: 500 })
    }

    let recalculatedCount = 0

    // 2. Optionally recalculate past trades for this symbol
    if (recalculate_past) {
      const { data: pastTrades } = await supabase
        .from('trades')
        .select('id, direction, open_price, close_price, status')
        .eq('user_id', user.id)
        .eq('symbol', uppercaseSymbol)
        .eq('status', 'closed')

      if (pastTrades && pastTrades.length > 0) {
        for (const t of pastTrades) {
          const pips = calculatePipsGained(
            t.direction as 'buy' | 'sell',
            Number(t.open_price),
            t.close_price != null ? Number(t.close_price) : null,
            numPipSize,
            boolConfirmed
          )

          await supabase
            .from('trades')
            .update({ pips_gained: pips })
            .eq('id', t.id)

          recalculatedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      config: updatedConfig,
      recalculated_count: recalculatedCount,
      message: `Konfigurasi pip ${uppercaseSymbol} berhasil disimpan${recalculate_past ? ` (${recalculatedCount} trade dihitung ulang)` : ''}`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: 'SERVER_ERROR', message: msg }, { status: 500 })
  }
}
