export type MT5Status = 'pending' | 'connected' | 'error'
export type AccountType = 'standard' | 'cent'
export type Platform = 'mt4' | 'mt5'

export interface MT5Connection {
  id: string
  accountNumber?: string
  brokerName?: string
  status: MT5Status
  lastError?: string
  lastSyncedAt?: string
  createdAt: string
  accountType?: AccountType
  account_type?: AccountType
  platform?: Platform
  currentBalance?: number
  balanceUsd?: number
}

