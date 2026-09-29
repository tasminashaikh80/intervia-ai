/**
 * Frontend notifications stored in localStorage.
 * Replace with API later per TRD.
 */

const STORAGE_KEY = 'intervia_notifications'

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

/** Seed a few helpful defaults once if empty */
export function ensureDefaultNotifications() {
  const existing = readAll()
  if (existing.length > 0) return existing
  const seed = [
    {
      id: 'n_welcome',
      title: 'Welcome to Intervia',
      body: 'Practice. Perform. Improve. Start your first voice interview anytime.',
      createdAt: new Date().toISOString(),
      read: false,
    },
    {
      id: 'n_tip',
      title: 'Interview tip',
      body: 'Pause briefly to think — the interviewer will wait for you to finish.',
      createdAt: new Date().toISOString(),
      read: false,
    },
  ]
  writeAll(seed)
  return seed
}

export function getNotifications() {
  return ensureDefaultNotifications()
}

export function getUnreadCount() {
  return getNotifications().filter((n) => !n.read).length
}

export function markAllNotificationsRead() {
  const next = getNotifications().map((n) => ({ ...n, read: true }))
  writeAll(next)
  return next
}

export function markNotificationRead(id) {
  const next = getNotifications().map((n) =>
    n.id === id ? { ...n, read: true } : n
  )
  writeAll(next)
  return next
}

export function addNotification({ title, body }) {
  const list = getNotifications()
  const item = {
    id: `n_${Date.now()}`,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
  }
  const next = [item, ...list].slice(0, 30)
  writeAll(next)
  return next
}
