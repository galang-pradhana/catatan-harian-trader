export type TradeDirection = 'buy' | 'sell'
export type TradeStatus = 'open' | 'closed'
export type TradingSession = 'asia' | 'london' | 'newyork'
export type JournalStatus = 'incomplete' | 'complete'
export type SelfGrade = 'A' | 'B' | 'C' | 'D' | 'F'
export type MoodType = 'neutral' | 'confident' | 'fomo' | 'anxious' | 'greedy'

export interface Strategy {
  id: string
  name: string
  color: string
}

export interface MistakeTag {
  id: string
  name: string
  color: string
}

export interface TradeScreenshot {
  id: string
  tradeId: string
  type: 'entry' | 'exit'
  url: string
  uploadedAt: string
}

export interface TradeJournal {
  tradeId: string
  reasonEntry?: string
  mood?: MoodType
  discipline?: 'yes' | 'no'
  lessonLearned?: string
  riskPercent?: number
  plannedRR?: number
  actualRR?: number
  selfGrade?: SelfGrade
  strategies?: Strategy[]
  mistakes?: MistakeTag[]
  screenshots?: TradeScreenshot[]
  updatedAt?: string
}

export interface Trade {
  id: string
  mt5TicketId: string
  symbol: string
  direction: TradeDirection
  volume: number
  openPrice: number
  closePrice?: number
  openTime: string
  closeTime?: string
  sl?: number
  tp?: number
  pnl?: number
  commission: number
  swap: number
  status: TradeStatus
  session?: TradingSession
  journalStatus: JournalStatus
  journal?: TradeJournal
}
