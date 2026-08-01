import { MT5Connection } from '@/types/mt5'

export const DUMMY_MT5_CONNECTIONS: MT5Connection[] = [
  {
    id: 'conn-1',
    accountNumber: '51294821',
    brokerName: 'IC Markets Global',
    status: 'connected',
    lastSyncedAt: '2 menit yang lalu',
    createdAt: '2026-07-28T10:00:00Z',
  },
  {
    id: 'conn-2',
    accountNumber: '10938274',
    brokerName: 'Exness Technologies',
    status: 'pending',
    createdAt: '2026-08-01T08:30:00Z',
  },
  {
    id: 'conn-3',
    accountNumber: '88274193',
    brokerName: 'Pepperstone Ltd',
    status: 'error',
    lastError: 'Token tidak valid atau sudah dicabut. Buat ulang koneksi.',
    lastSyncedAt: '1 hari yang lalu',
    createdAt: '2026-07-20T14:15:00Z',
  },
]
