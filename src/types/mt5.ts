export type MT5Status = 'pending' | 'connected' | 'error'

export interface MT5Connection {
  id: string
  accountNumber?: string
  brokerName?: string
  status: MT5Status
  lastError?: string
  lastSyncedAt?: string
  createdAt: string
}
