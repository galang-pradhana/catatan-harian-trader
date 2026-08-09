export interface AdminSettings {
  requireAdminApproval: boolean
}

const SETTINGS_STORAGE_KEY = 'chtrader_admin_settings_v1'

const defaultSettings: AdminSettings = {
  requireAdminApproval: true,
}

let inMemorySettings: AdminSettings = { ...defaultSettings }

export function getAdminSettings(): AdminSettings {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    } catch {
      // Ignore localStorage errors
    }
  }
  return inMemorySettings
}

export function saveAdminSettings(settings: Partial<AdminSettings>): AdminSettings {
  inMemorySettings = { ...inMemorySettings, ...settings }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(inMemorySettings))
    } catch {
      // Ignore localStorage errors
    }
  }
  return inMemorySettings
}
