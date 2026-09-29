import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'

const AuthContext = createContext(null)

const STORAGE_USERS = 'intervia_users'
const STORAGE_SESSION = 'intervia_session'

/** Empty dashboard data for a new user (replace with API later). */
export function createEmptyUserData() {
  return {
    statistics: {
      totalInterviews: 0,
      averageScore: null,
      questionsPracticed: 0,
      practiceTimeMinutes: 0,
    },
    interviews: [],
    progress: [],
  }
}

/** Default profile fields for Intervia users */
export function createEmptyProfile() {
  return {
    title: '',
    bio: '',
    skills: '',
    experienceLevel: 'Student',
    education: '',
    avatarColor: '#06b6d4',
  }
}

function readUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_USERS)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeUsers(users) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(users))
}

function readSessionEmail() {
  return localStorage.getItem(STORAGE_SESSION) || null
}

function writeSessionEmail(email) {
  if (email) localStorage.setItem(STORAGE_SESSION, email)
  else localStorage.removeItem(STORAGE_SESSION)
}

function toPublicUser(record) {
  const profile = { ...createEmptyProfile(), ...(record.profile || {}) }
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    profile,
    statistics: record.statistics ?? createEmptyUserData().statistics,
    interviews: record.interviews ?? [],
    progress: record.progress ?? [],
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  // Restore session on load
  useEffect(() => {
    const email = readSessionEmail()
    if (email) {
      const users = readUsers()
      const record = users[email.toLowerCase()]
      if (record) {
        setUser(toPublicUser(record))
      } else {
        writeSessionEmail(null)
      }
    }
    setReady(true)
  }, [])

  const register = useCallback(({ name, email, password }) => {
    const normalized = email.trim().toLowerCase()
    const users = readUsers()
    if (users[normalized]) {
      return { ok: false, error: 'An account with this email already exists' }
    }
    const empty = createEmptyUserData()
    const record = {
      id: `user_${Date.now()}`,
      name: name.trim(),
      email: normalized,
      password, // frontend-only temporary; never use in production
      profile: createEmptyProfile(),
      ...empty,
      createdAt: new Date().toISOString(),
    }
    users[normalized] = record
    writeUsers(users)
    writeSessionEmail(normalized)
    setUser(toPublicUser(record))
    return { ok: true }
  }, [])

  const login = useCallback(({ email, password }) => {
    const normalized = email.trim().toLowerCase()
    const users = readUsers()
    const record = users[normalized]
    if (!record || record.password !== password) {
      return { ok: false, error: 'Invalid email or password' }
    }
    writeSessionEmail(normalized)
    setUser(toPublicUser(record))
    return { ok: true }
  }, [])

  const logout = useCallback(() => {
    writeSessionEmail(null)
    setUser(null)
  }, [])

  /**
   * Merge interview results into the logged-in user.
   * Call this after a real interview completes (backend will replace this later).
   */
  const updateUserData = useCallback((partial) => {
    setUser((prev) => {
      if (!prev) return prev
      const next = {
        ...prev,
        ...partial,
        statistics: partial.statistics
          ? { ...prev.statistics, ...partial.statistics }
          : prev.statistics,
        interviews: partial.interviews ?? prev.interviews,
        progress: partial.progress ?? prev.progress,
        profile: partial.profile
          ? { ...prev.profile, ...partial.profile }
          : prev.profile,
      }
      const users = readUsers()
      const key = next.email.toLowerCase()
      if (users[key]) {
        users[key] = {
          ...users[key],
          name: next.name,
          statistics: next.statistics,
          interviews: next.interviews,
          progress: next.progress,
          profile: next.profile,
        }
        writeUsers(users)
      }
      return next
    })
  }, [])

  /** Update profile + display name; persists to localStorage */
  const updateProfile = useCallback((fields) => {
    setUser((prev) => {
      if (!prev) return prev
      const nextName = fields.name != null ? String(fields.name).trim() : prev.name
      const nextProfile = {
        ...createEmptyProfile(),
        ...prev.profile,
        ...fields.profile,
      }
      if (fields.title != null) nextProfile.title = fields.title
      if (fields.bio != null) nextProfile.bio = fields.bio
      if (fields.skills != null) nextProfile.skills = fields.skills
      if (fields.experienceLevel != null) nextProfile.experienceLevel = fields.experienceLevel
      if (fields.education != null) nextProfile.education = fields.education
      if (fields.avatarColor != null) nextProfile.avatarColor = fields.avatarColor

      const next = {
        ...prev,
        name: nextName || prev.name,
        profile: nextProfile,
      }

      const users = readUsers()
      const key = next.email.toLowerCase()
      if (users[key]) {
        users[key] = {
          ...users[key],
          name: next.name,
          profile: next.profile,
        }
        writeUsers(users)
      }
      return next
    })
    return { ok: true }
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      isAuthenticated: Boolean(user),
      register,
      login,
      logout,
      updateUserData,
      updateProfile,
    }),
    [user, ready, register, login, logout, updateUserData, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
