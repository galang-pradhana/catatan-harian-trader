export type EmotionCategoryKey = 'positive' | 'fear' | 'greed' | 'impulsive' | 'other'

export interface EmotionOption {
  key: string
  label: string
  emoji: string
  category: EmotionCategoryKey
  categoryLabel: string
  badgeColor: string
}

export interface TriggerTagOption {
  id: string
  label: string
  isCustom?: boolean
}

export interface DailyPsychologyLog {
  id?: string
  logDate: string // 'YYYY-MM-DD'
  emotion: string
  category: EmotionCategoryKey
  triggerTags: string[]
  reflectionNote?: string
  createdAt?: string
  updatedAt?: string
}

export interface DayTradeSummary {
  date: string // 'YYYY-MM-DD'
  tradesCount: number
  winsCount: number
  lossesCount: number
  totalPnl: number
}

export interface EmotionCategoryAnalytics {
  category: EmotionCategoryKey
  categoryLabel: string
  badgeColor: string
  daysCount: number
  tradesCount: number
  winsCount: number
  lossesCount: number
  winRate: number
  totalPnl: number
  avgPnlPerTrade: number
  emotions: Array<{
    key: string
    label: string
    emoji: string
    daysCount: number
    winRate: number
    totalPnl: number
  }>
}

export interface TriggerTagAnalytics {
  tagId: string
  tagLabel: string
  occurrenceCount: number
  lossTradesCount: number
  totalPnl: number
  winRate: number
}

export interface PsychologyAnalyticsSummary {
  disciplineStreak: number
  totalLogsCount: number
  positivePercentage: number
  categoryBreakdown: EmotionCategoryAnalytics[]
  triggerTagRankings: TriggerTagAnalytics[]
  keyInsights: string[]
  emotionTrend: Array<{
    date: string
    positive: number
    fear: number
    greed: number
    impulsive: number
    other: number
  }>
}
