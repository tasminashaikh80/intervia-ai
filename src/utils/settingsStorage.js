/**
 * App settings (frontend-only). Persist in localStorage until backend exists.
 */

const STORAGE_KEY = 'intervia_settings'

export const defaultSettings = {
  emailNotifications: true,
  interviewReminders: true,
  resultAlerts: true,
  preferredDifficulty: 'Intermediate',
  preferredDuration: 20,
  autoScrollTranscript: true,
  reduceMotion: false,
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultSettings }
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(partial) {
  const next = { ...getSettings(), ...partial }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}
