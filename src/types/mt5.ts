export type MT5Status = 'pending' | 'connected' | 'error'
export type AccountType = 'standard' | 'cent'
export type Platform = 'mt4' | 'mt5' | 'manual'

export interface MT5Connection {
  id: string
  accountNumber?: string
  account_number?: string
  brokerName?: string
  broker_name?: string
  status: MT5Status
  lastError?: string
  lastSyncedAt?: string
  createdAt: string
  accountType?: AccountType
  account_type?: AccountType
  platform?: Platform
  currentBalance?: number
  current_balance?: number
  balanceUsd?: number
}

