import { EmotionOption, TriggerTagOption, EmotionCategoryKey } from '@/types/psychology'

export const EMOTION_CATEGORY_DEFS: Record<
  EmotionCategoryKey,
  { label: string; color: string; badgeColor: string; bgTint: string }
> = {
  positive: {
    label: 'Positif / Sehat',
    color: '#10B981',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    bgTint: 'bg-emerald-500/10 border-emerald-500/30',
  },
  fear: {
    label: 'Takut / Ragu',
    color: '#3B82F6',
    badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    bgTint: 'bg-blue-500/10 border-blue-500/30',
  },
  greed: {
    label: 'Serakah-driven',
    color: '#F59E0B',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    bgTint: 'bg-amber-500/10 border-amber-500/30',
  },
  impulsive: {
    label: 'Impulsif / Pasca-loss',
    color: '#EF4444',
    badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
    bgTint: 'bg-red-500/10 border-red-500/30',
  },
  other: {
    label: 'Lainnya',
    color: '#64748B',
    badgeColor: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    bgTint: 'bg-slate-500/10 border-slate-500/30',
  },
}

export const EMOTION_TAXONOMY: EmotionOption[] = [
  // 1. Positif / Sehat (Green)
  {
    key: 'confident',
    label: 'Percaya Diri',
    emoji: '😊',
    category: 'positive',
    categoryLabel: 'Positif / Sehat',
    badgeColor: EMOTION_CATEGORY_DEFS.positive.badgeColor,
  },
  {
    key: 'calm',
    label: 'Tenang',
    emoji: '😌',
    category: 'positive',
    categoryLabel: 'Positif / Sehat',
    badgeColor: EMOTION_CATEGORY_DEFS.positive.badgeColor,
  },
  {
    key: 'disciplined',
    label: 'Disiplin',
    emoji: '🎯',
    category: 'positive',
    categoryLabel: 'Positif / Sehat',
    badgeColor: EMOTION_CATEGORY_DEFS.positive.badgeColor,
  },
  {
    key: 'focused',
    label: 'Fokus',
    emoji: '🧐',
    category: 'positive',
    categoryLabel: 'Positif / Sehat',
    badgeColor: EMOTION_CATEGORY_DEFS.positive.badgeColor,
  },

  // 2. Takut / Ragu (Blue)
  {
    key: 'anxious',
    label: 'Cemas',
    emoji: '😰',
    category: 'fear',
    categoryLabel: 'Takut / Ragu',
    badgeColor: EMOTION_CATEGORY_DEFS.fear.badgeColor,
  },
  {
    key: 'fearful',
    label: 'Takut',
    emoji: '😨',
    category: 'fear',
    categoryLabel: 'Takut / Ragu',
    badgeColor: EMOTION_CATEGORY_DEFS.fear.badgeColor,
  },
  {
    key: 'hesitant',
    label: 'Ragu-ragu',
    emoji: '🤔',
    category: 'fear',
    categoryLabel: 'Takut / Ragu',
    badgeColor: EMOTION_CATEGORY_DEFS.fear.badgeColor,
  },

  // 3. Serakah-driven (Yellow/Amber)
  {
    key: 'greedy',
    label: 'Serakah',
    emoji: '🤑',
    category: 'greed',
    categoryLabel: 'Serakah-driven',
    badgeColor: EMOTION_CATEGORY_DEFS.greed.badgeColor,
  },
  {
    key: 'fomo',
    label: 'FOMO',
    emoji: '😤',
    category: 'greed',
    categoryLabel: 'Serakah-driven',
    badgeColor: EMOTION_CATEGORY_DEFS.greed.badgeColor,
  },
  {
    key: 'overconfident',
    label: 'Overconfident',
    emoji: '🚀',
    category: 'greed',
    categoryLabel: 'Serakah-driven',
    badgeColor: EMOTION_CATEGORY_DEFS.greed.badgeColor,
  },

  // 4. Impulsif / Pasca-loss (Red)
  {
    key: 'frustrated',
    label: 'Frustrasi',
    emoji: '😫',
    category: 'impulsive',
    categoryLabel: 'Impulsif / Pasca-loss',
    badgeColor: EMOTION_CATEGORY_DEFS.impulsive.badgeColor,
  },
  {
    key: 'angry',
    label: 'Marah',
    emoji: '😡',
    category: 'impulsive',
    categoryLabel: 'Impulsif / Pasca-loss',
    badgeColor: EMOTION_CATEGORY_DEFS.impulsive.badgeColor,
  },
  {
    key: 'revenge',
    label: 'Revenge Trading',
    emoji: '🤬',
    category: 'impulsive',
    categoryLabel: 'Impulsif / Pasca-loss',
    badgeColor: EMOTION_CATEGORY_DEFS.impulsive.badgeColor,
  },
  {
    key: 'panicked',
    label: 'Panik',
    emoji: '😱',
    category: 'impulsive',
    categoryLabel: 'Impulsif / Pasca-loss',
    badgeColor: EMOTION_CATEGORY_DEFS.impulsive.badgeColor,
  },

  // 5. Lainnya (Grey)
  {
    key: 'bored',
    label: 'Bosan',
    emoji: '🥱',
    category: 'other',
    categoryLabel: 'Lainnya',
    badgeColor: EMOTION_CATEGORY_DEFS.other.badgeColor,
  },
  {
    key: 'neutral',
    label: 'Netral',
    emoji: '😐',
    category: 'other',
    categoryLabel: 'Lainnya',
    badgeColor: EMOTION_CATEGORY_DEFS.other.badgeColor,
  },
]

export const PRESET_TRIGGER_TAGS: TriggerTagOption[] = [
  { id: 'loss_streak', label: 'Abis loss beruntun' },
  { id: 'big_win', label: 'Abis profit besar' },
  { id: 'high_impact_news', label: 'Berita fundamental/high impact news' },
  { id: 'lack_of_sleep', label: 'Kurang tidur/kondisi fisik' },
  { id: 'late_entry', label: 'Telat entry/FOMO harga' },
  { id: 'target_pressure', label: 'Tekanan target harian/mingguan' },
  { id: 'personal_distraction', label: 'Gangguan personal (keluarga/pekerjaan)' },
]

export function getEmotionByKey(key: string): EmotionOption {
  return (
    EMOTION_TAXONOMY.find((e) => e.key === key) || {
      key: key || 'neutral',
      label: key || 'Netral',
      emoji: '😐',
      category: 'other',
      categoryLabel: 'Lainnya',
      badgeColor: EMOTION_CATEGORY_DEFS.other.badgeColor,
    }
  )
}
