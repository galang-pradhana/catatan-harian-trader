import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/services/supabase/server'
import { EMOTION_TAXONOMY, EMOTION_CATEGORY_DEFS, PRESET_TRIGGER_TAGS, getEmotionByKey } from '@/constants/psychology'
import { EmotionCategoryKey } from '@/types/psychology'

const LogSchema = z.object({
  log_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  emotion:         z.string().min(1, 'Emosi harus dipilih'),
  trigger_tags:    z.array(z.string()).optional(),
  reflection_note: z.string().max(2000).optional(),
})

// GET /api/psychology/logs?month=YYYY-MM — Fetch daily logs, trade aggregates, discipline streak & correlation insights
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7) // 'YYYY-MM'

    const [yearStr, monthStr] = monthParam.split('-')
    const y = parseInt(yearStr, 10)
    const m = parseInt(monthStr, 10)

    const startDate = `${monthParam}-01`
    const lastDayNum = new Date(y, m, 0).getDate()
    const endDate = `${monthParam}-${String(lastDayNum).padStart(2, '0')}`

    // 1. Fetch Daily Psychology Logs for the month
    const { data: logsData, error: logsErr } = await supabase
      .from('daily_psychology_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true })

    if (logsErr && logsErr.code !== 'PGRST116') {
      // If table doesn't exist yet, gracefully fallback
      console.warn('Psychology logs query warning:', logsErr.message)
    }

    const logs = logsData ?? []

    // 2. Fetch Trades for the month to link trade statistics per date
    const monthStartIso = new Date(Date.UTC(y, m - 1, 1)).toISOString()
    const monthEndIso   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)).toISOString()

    const { data: tradesData } = await supabase
      .from('trades')
      .select('id, pnl, status, open_time, close_time, symbol, direction')
      .eq('user_id', user.id)
      .gte('open_time', monthStartIso)
      .lte('open_time', monthEndIso)

    const trades = tradesData ?? []

    // Map trades per date string 'YYYY-MM-DD'
    const tradeSummaryMap = new Map<string, { tradesCount: number; winsCount: number; lossesCount: number; totalPnl: number; tradesList: typeof trades }>()

    trades.forEach((t) => {
      const dateStr = new Date(t.open_time).toISOString().slice(0, 10)
      const existing = tradeSummaryMap.get(dateStr) || { tradesCount: 0, winsCount: 0, lossesCount: 0, totalPnl: 0, tradesList: [] }
      
      existing.tradesCount++
      existing.tradesList.push(t)
      if (t.status === 'closed' && t.pnl !== null && t.pnl !== undefined) {
        existing.totalPnl += Number(t.pnl)
        if (Number(t.pnl) > 0) existing.winsCount++
        else if (Number(t.pnl) < 0) existing.lossesCount++
      }
      tradeSummaryMap.set(dateStr, existing)
    })

    // 3. Compute Discipline Streak (consecutive days with 'positive' emotion up to latest date)
    // Fetch all logs ordered by log_date DESC
    const { data: allLogsData } = await supabase
      .from('daily_psychology_logs')
      .select('log_date, emotion, category')
      .eq('user_id', user.id)
      .order('log_date', { ascending: false })
      .limit(60)

    let disciplineStreak = 0
    if (allLogsData && allLogsData.length > 0) {
      for (const log of allLogsData) {
        const cat = log.category || getEmotionByKey(log.emotion).category
        if (cat === 'positive') {
          disciplineStreak++
        } else if (cat === 'impulsive' || cat === 'greed') {
          break
        }
      }
    }

    // 4. Compute Emotion-Performance Correlation Analytics
    const categoryStats: Record<EmotionCategoryKey, {
      daysCount: number
      tradesCount: number
      winsCount: number
      lossesCount: number
      totalPnl: number
      emotionsMap: Record<string, { daysCount: number; winsCount: number; totalPnl: number }>
    }> = {
      positive:  { daysCount: 0, tradesCount: 0, winsCount: 0, lossesCount: 0, totalPnl: 0, emotionsMap: {} },
      fear:      { daysCount: 0, tradesCount: 0, winsCount: 0, lossesCount: 0, totalPnl: 0, emotionsMap: {} },
      greed:     { daysCount: 0, tradesCount: 0, winsCount: 0, lossesCount: 0, totalPnl: 0, emotionsMap: {} },
      impulsive: { daysCount: 0, tradesCount: 0, winsCount: 0, lossesCount: 0, totalPnl: 0, emotionsMap: {} },
      other:     { daysCount: 0, tradesCount: 0, winsCount: 0, lossesCount: 0, totalPnl: 0, emotionsMap: {} },
    }

    const tagLossMap = new Map<string, { tagLabel: string; occurrenceCount: number; lossTradesCount: number; totalPnl: number; winRate: number }>()

    logs.forEach((log) => {
      const emoObj = getEmotionByKey(log.emotion)
      const catKey = (log.category as EmotionCategoryKey) || emoObj.category
      const cStat = categoryStats[catKey] || categoryStats.other

      cStat.daysCount++

      // Get trade summary for this log date
      const dayTrades = tradeSummaryMap.get(log.log_date)
      if (dayTrades) {
        cStat.tradesCount += dayTrades.tradesCount
        cStat.winsCount += dayTrades.winsCount
        cStat.lossesCount += dayTrades.lossesCount
        cStat.totalPnl += dayTrades.totalPnl
      }

      // Emotion breakdown
      const emoMapEntry = cStat.emotionsMap[log.emotion] || { daysCount: 0, winsCount: 0, totalPnl: 0 }
      emoMapEntry.daysCount++
      if (dayTrades) {
        emoMapEntry.winsCount += dayTrades.winsCount
        emoMapEntry.totalPnl += dayTrades.totalPnl
      }
      cStat.emotionsMap[log.emotion] = emoMapEntry

      // Trigger tag analysis
      const tags: string[] = log.trigger_tags || []
      tags.forEach((tagId) => {
        const preset = PRESET_TRIGGER_TAGS.find((p) => p.id === tagId)
        const tagLabel = preset ? preset.label : tagId
        const existingTag = tagLossMap.get(tagId) || { tagLabel, occurrenceCount: 0, lossTradesCount: 0, totalPnl: 0, winRate: 0 }
        existingTag.occurrenceCount++
        if (dayTrades) {
          existingTag.lossTradesCount += dayTrades.lossesCount
          existingTag.totalPnl += dayTrades.totalPnl
        }
        tagLossMap.set(tagId, existingTag)
      })
    })

    const categoryBreakdown = (Object.keys(categoryStats) as EmotionCategoryKey[]).map((catKey) => {
      const c = categoryStats[catKey]
      const def = EMOTION_CATEGORY_DEFS[catKey]
      const winRate = c.tradesCount > 0 ? (c.winsCount / c.tradesCount) * 100 : 0
      const avgPnlPerTrade = c.tradesCount > 0 ? c.totalPnl / c.tradesCount : 0

      const emotionsArr = Object.keys(c.emotionsMap).map((emoKey) => {
        const emoObj = getEmotionByKey(emoKey)
        const eData = c.emotionsMap[emoKey]
        return {
          key: emoKey,
          label: emoObj.label,
          emoji: emoObj.emoji,
          daysCount: eData.daysCount,
          winRate: c.tradesCount > 0 ? (eData.winsCount / c.tradesCount) * 100 : 0,
          totalPnl: eData.totalPnl,
        }
      })

      return {
        category: catKey,
        categoryLabel: def.label,
        badgeColor: def.badgeColor,
        daysCount: c.daysCount,
        tradesCount: c.tradesCount,
        winsCount: c.winsCount,
        lossesCount: c.lossesCount,
        winRate,
        totalPnl: c.totalPnl,
        avgPnlPerTrade,
        emotions: emotionsArr,
      }
    })

    // Trigger Tag Rankings
    const triggerTagRankings = Array.from(tagLossMap.entries())
      .map(([id, item]) => ({
        tagId: id,
        tagLabel: item.tagLabel,
        occurrenceCount: item.occurrenceCount,
        lossTradesCount: item.lossTradesCount,
        totalPnl: item.totalPnl,
        winRate: item.occurrenceCount > 0 ? Math.max(0, 100 - (item.lossTradesCount * 20)) : 0,
      }))
      .sort((a, b) => a.totalPnl - b.totalPnl)

    // 5. Generate Automated Highlight Insights
    const keyInsights: string[] = []

    const impulsiveStat = categoryStats.impulsive
    const greedStat = categoryStats.greed
    const positiveStat = categoryStats.positive

    const badTradesTotal = impulsiveStat.tradesCount + greedStat.tradesCount
    const badLossesTotal = impulsiveStat.lossesCount + greedStat.lossesCount
    const totalLossesInMonth = Array.from(tradeSummaryMap.values()).reduce((acc, d) => acc + d.lossesCount, 0)

    if (totalLossesInMonth > 0 && badLossesTotal > 0) {
      const pct = Math.round((badLossesTotal / totalLossesInMonth) * 100)
      if (pct >= 40) {
        keyInsights.push(
          `⚠️ ${pct}% trade loss bulan ini terjadi saat emosi dikategorikan Impulsif atau Serakah-driven.`
        )
      }
    }

    if (positiveStat.daysCount > 0 && positiveStat.tradesCount > 0) {
      const posWinRate = Math.round((positiveStat.winsCount / positiveStat.tradesCount) * 100)
      keyInsights.push(
        `🎯 Saat emosi Positif/Sehat tercatat, Win Rate Anda mencapai ${posWinRate}% dengan total PnL +$${positiveStat.totalPnl.toFixed(2)}.`
      )
    }

    if (triggerTagRankings.length > 0 && triggerTagRankings[0].totalPnl < 0) {
      keyInsights.push(
        `📌 Tag pemicu "${triggerTagRankings[0].tagLabel}" paling berdampak negatif pada performa (PnL -$${Math.abs(triggerTagRankings[0].totalPnl).toFixed(2)}).`
      )
    }

    if (keyInsights.length === 0) {
      keyInsights.push(
        `💡 Teruskan mencatat emosi harian untuk membuka analisis korelasi performa yang lebih akurat.`
      )
    }

    // Convert trade summary map to serializable array
    const tradeSummaries = Array.from(tradeSummaryMap.entries()).map(([date, d]) => ({
      date,
      tradesCount: d.tradesCount,
      winsCount: d.winsCount,
      lossesCount: d.lossesCount,
      totalPnl: d.totalPnl,
    }))

    return NextResponse.json({
      logs,
      tradeSummaries,
      disciplineStreak,
      categoryBreakdown,
      triggerTagRankings,
      keyInsights,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}

// POST /api/psychology/logs — Upsert daily psychology log
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
    const parsed = LogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'Data tidak valid', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { log_date, emotion, trigger_tags = [], reflection_note } = parsed.data
    const emotionDef = getEmotionByKey(emotion)
    const category = emotionDef.category

    const { data: logRecord, error: upsertErr } = await supabase
      .from('daily_psychology_logs')
      .upsert(
        {
          user_id:         user.id,
          log_date,
          emotion,
          category,
          trigger_tags,
          reflection_note: reflection_note || null,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: 'user_id, log_date' }
      )
      .select('*')
      .single()

    if (upsertErr) {
      return NextResponse.json(
        { error: 'DATABASE_ERROR', message: upsertErr.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, log: logRecord })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: msg },
      { status: 500 }
    )
  }
}
