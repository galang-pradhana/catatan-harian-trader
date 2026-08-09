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

    // 2. Fetch Trades for the month to link trade statistics & moods per date
    const monthStartIso = new Date(Date.UTC(y, m - 1, 1)).toISOString()
    const monthEndIso   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)).toISOString()

    const { data: tradesData } = await supabase
      .from('trades')
      .select('id, mt5_ticket_id, pnl, status, open_time, close_time, symbol, direction, volume, open_price, close_price, trade_journal(mood, discipline, reason_entry)')
      .eq('user_id', user.id)
      .gte('open_time', monthStartIso)
      .lte('open_time', monthEndIso)
      .order('open_time', { ascending: true })

    const trades = tradesData ?? []

    // Fetch mistake tags & strategies for trades in the month for analytics
    const tradeIds = trades.map((t: any) => t.id)
    const mistakeTagStatsMap: Record<string, { tagId: string; tagName: string; tagColor: string; count: number; lossCount: number; totalPnl: number }> = {}
    const strategyStatsMap: Record<string, { strategyId: string; strategyName: string; strategyColor: string; tradesCount: number; winsCount: number; lossesCount: number; winRate: number; avgPnlPerTrade: number; totalPnl: number }> = {}

    // Map trade -> pnl/status
    const tradePnlMap = new Map<string, { pnl: number; isLoss: boolean }>()
    trades.forEach((t: any) => {
      const pnl = Number(t.pnl || 0)
      tradePnlMap.set(t.id, { pnl, isLoss: t.status === 'closed' && pnl < 0 })
    })

    if (tradeIds.length > 0) {
      const { data: tmData } = await supabase
        .from('trade_mistakes')
        .select('trade_id, mistake_tag_id, mistake_tags(id, name, color)')
        .in('trade_id', tradeIds)

      if (tmData) {
        tmData.forEach((tm: any) => {
          const tag = tm.mistake_tags
          if (tag) {
            const tInfo = tradePnlMap.get(tm.trade_id) || { pnl: 0, isLoss: false }
            if (!mistakeTagStatsMap[tag.id]) {
              mistakeTagStatsMap[tag.id] = {
                tagId: tag.id,
                tagName: tag.name,
                tagColor: tag.color || '#EF4444',
                count: 0,
                lossCount: 0,
                totalPnl: 0,
              }
            }
            mistakeTagStatsMap[tag.id].count++
            if (tInfo.isLoss) mistakeTagStatsMap[tag.id].lossCount++
            mistakeTagStatsMap[tag.id].totalPnl += tInfo.pnl
          }
        })
      }

      const { data: tsData } = await supabase
        .from('trade_strategies')
        .select('trade_id, strategy_id, strategies(id, name, color)')
        .in('trade_id', tradeIds)

      if (tsData) {
        tsData.forEach((ts: any) => {
          const strat = ts.strategies
          if (strat) {
            const tInfo = tradePnlMap.get(ts.trade_id)
            if (!strategyStatsMap[strat.id]) {
              strategyStatsMap[strat.id] = {
                strategyId: strat.id,
                strategyName: strat.name,
                strategyColor: strat.color || '#D4A94C',
                tradesCount: 0,
                winsCount: 0,
                lossesCount: 0,
                winRate: 0,
                avgPnlPerTrade: 0,
                totalPnl: 0,
              }
            }
            const sStat = strategyStatsMap[strat.id]
            sStat.tradesCount++
            if (tInfo) {
              sStat.totalPnl += tInfo.pnl
              if (tInfo.pnl > 0) sStat.winsCount++
              else if (tInfo.isLoss) sStat.lossesCount++
            }
          }
        })

        Object.values(strategyStatsMap).forEach((sStat) => {
          sStat.winRate = sStat.tradesCount > 0 ? (sStat.winsCount / sStat.tradesCount) * 100 : 0
          sStat.avgPnlPerTrade = sStat.tradesCount > 0 ? sStat.totalPnl / sStat.tradesCount : 0
        })
      }
    }

    // Map trades per date string 'YYYY-MM-DD'
    const tradeSummaryMap = new Map<string, {
      tradesCount: number
      winsCount: number
      lossesCount: number
      totalPnl: number
      tradesList: Array<{
        id: string
        mt5TicketId?: string
        symbol: string
        direction: string
        volume: number
        openPrice: number
        closePrice?: number
        pnl?: number
        status: string
        mood?: string
        discipline?: string
      }>
    }>()

    // Auto-suggested mood per date (computed from mode of trade emotions)
    const autoSuggestedMoods: Record<string, { emotion: string; category: string; count: number }> = {}

    // Discipline stats at trade-level
    const tradeDisciplineStats = {
      yes: { discipline: 'yes', label: 'Ikut Rules ✓', tradesCount: 0, winsCount: 0, lossesCount: 0, winRate: 0, totalPnl: 0 },
      no:  { discipline: 'no', label: 'Melanggar Rules ✗', tradesCount: 0, winsCount: 0, lossesCount: 0, winRate: 0, totalPnl: 0 },
    }

    trades.forEach((t: any) => {
      const dateStr = new Date(t.open_time).toISOString().slice(0, 10)
      const existing = tradeSummaryMap.get(dateStr) || { tradesCount: 0, winsCount: 0, lossesCount: 0, totalPnl: 0, tradesList: [] }

      const journal = (t as any).trade_journal
      const tradeMood = journal?.mood
      const tradeDiscipline = journal?.discipline

      existing.tradesCount++
      existing.tradesList.push({
        id: t.id,
        mt5TicketId: t.mt5_ticket_id,
        symbol: t.symbol,
        direction: t.direction,
        volume: Number(t.volume || 0),
        openPrice: Number(t.open_price || 0),
        closePrice: t.close_price !== null ? Number(t.close_price) : undefined,
        pnl: t.pnl !== null ? Number(t.pnl) : undefined,
        status: t.status,
        mood: tradeMood,
        discipline: tradeDiscipline,
      })

      const pnlVal = Number(t.pnl || 0)
      if (t.status === 'closed' && t.pnl !== null && t.pnl !== undefined) {
        existing.totalPnl += pnlVal
        if (pnlVal > 0) existing.winsCount++
        else if (pnlVal < 0) existing.lossesCount++
      }
      tradeSummaryMap.set(dateStr, existing)

      // Collect trade discipline metrics
      if (tradeDiscipline === 'yes' || tradeDiscipline === 'no') {
        const dStat = tradeDisciplineStats[tradeDiscipline as 'yes' | 'no']
        dStat.tradesCount++
        dStat.totalPnl += pnlVal
        if (pnlVal > 0) dStat.winsCount++
        else if (pnlVal < 0) dStat.lossesCount++
      }
    })

    // Compute winRate for tradeDisciplineStats
    tradeDisciplineStats.yes.winRate = tradeDisciplineStats.yes.tradesCount > 0
      ? (tradeDisciplineStats.yes.winsCount / tradeDisciplineStats.yes.tradesCount) * 100
      : 0
    tradeDisciplineStats.no.winRate = tradeDisciplineStats.no.tradesCount > 0
      ? (tradeDisciplineStats.no.winsCount / tradeDisciplineStats.no.tradesCount) * 100
      : 0

    // Compute Auto-Suggested Mood (Mode) per date from trade list
    tradeSummaryMap.forEach((summary, dateStr) => {
      const moodCounts: Record<string, number> = {}
      summary.tradesList.forEach((tr) => {
        if (tr.mood) {
          moodCounts[tr.mood] = (moodCounts[tr.mood] || 0) + 1
        }
      })

      let modeEmotion: string | null = null
      let maxCount = 0
      Object.entries(moodCounts).forEach(([emoKey, count]) => {
        if (count > maxCount) {
          maxCount = count
          modeEmotion = emoKey
        }
      })

      if (modeEmotion) {
        const emoObj = getEmotionByKey(modeEmotion)
        autoSuggestedMoods[dateStr] = {
          emotion: modeEmotion,
          category: emoObj.category,
          count: maxCount,
        }
      }
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

    // Trade Strategy Performance Rankings
    const strategyRankings = Object.values(strategyStatsMap).sort((a, b) => b.tradesCount - a.tradesCount)

    // Trade Mistake Tag Rankings
    const tradeMistakeRankings = Object.values(mistakeTagStatsMap).sort((a, b) => b.count - a.count)

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

    if (strategyRankings.length > 0) {
      const lowestWrStrat = [...strategyRankings].sort((a, b) => a.winRate - b.winRate)[0]
      if (lowestWrStrat && lowestWrStrat.tradesCount >= 2) {
        keyInsights.push(
          `📊 Strategi "${lowestWrStrat.strategyName}" memiliki Win Rate terendah (${lowestWrStrat.winRate.toFixed(0)}%) dari ${lowestWrStrat.tradesCount} trade — pertimbangkan evaluasi ulang.`
        )
      }
    }

    if (triggerTagRankings.length > 0 && triggerTagRankings[0].totalPnl < 0) {
      keyInsights.push(
        `📌 Tag pemicu "${triggerTagRankings[0].tagLabel}" paling berdampak negatif pada performa (PnL -$${Math.abs(triggerTagRankings[0].totalPnl).toFixed(2)}).`
      )
    }

    if (tradeDisciplineStats.yes.tradesCount > 0 && tradeDisciplineStats.no.tradesCount > 0) {
      const yesWr = Math.round(tradeDisciplineStats.yes.winRate)
      const noWr = Math.round(tradeDisciplineStats.no.winRate)
      keyInsights.push(
        `🛡️ Win Rate saat Ikut Rules (${yesWr}%) jauh lebih tinggi dibanding saat Melanggar Rules (${noWr}%).`
      )
    }

    if (tradeMistakeRankings.length > 0) {
      const worstMistake = [...tradeMistakeRankings].sort((a, b) => a.totalPnl - b.totalPnl)[0]
      keyInsights.push(
        `⚠️ Tag Kesalahan Trade "${worstMistake.tagName}" berkontribusi pada kerugian net $${worstMistake.totalPnl.toFixed(2)} (${worstMistake.count}x tercatat).`
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
      tradesList: d.tradesList,
    }))

    return NextResponse.json({
      logs,
      autoSuggestedMoods,
      tradeSummaries,
      disciplineStreak,
      categoryBreakdown,
      triggerTagRankings,
      disciplineStats: [tradeDisciplineStats.yes, tradeDisciplineStats.no],
      tradeMistakeRankings,
      strategyRankings,
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
