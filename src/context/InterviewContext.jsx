import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'

const InterviewContext = createContext(null)

const STORAGE_KEY = 'intervia_interview_config'

export const defaultConfig = {
  role: 'Junior Web Developer',
  customRole: '',
  interviewType: 'Mixed',
  difficulty: 'Intermediate',
  experienceLevel: 'Student',
  duration: 20,
  /** 'voice' | 'text' */
  mode: 'voice',
}

function readStoredConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Never persist resume text in localStorage
    const { resumeText: _rt, resumeFileName: _rf, ...safe } = parsed
    return { ...defaultConfig, ...safe }
  } catch {
    return null
  }
}

export function InterviewProvider({ children }) {
  const [config, setConfigState] = useState(() => readStoredConfig() || { ...defaultConfig })
  // Resume text stays in memory only for the current session
  const [resumeText, setResumeText] = useState('')
  const [resumeFileName, setResumeFileName] = useState('')

  useEffect(() => {
    // Persist only non-sensitive config fields
    const { resumeText: _a, resumeFileName: _b, ...safe } = config
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe))
  }, [config])

  const setConfig = useCallback((partial) => {
    setConfigState((prev) => ({ ...prev, ...partial }))
  }, [])

  const resetConfig = useCallback(() => {
    setConfigState({ ...defaultConfig })
    setResumeText('')
    setResumeFileName('')
  }, [])

  const clearResume = useCallback(() => {
    setResumeText('')
    setResumeFileName('')
  }, [])

  /** Resolved role string for the AI interviewer */
  const resolvedRole = useMemo(() => {
    if (config.role === 'Custom Role') {
      return config.customRole.trim() || 'Custom Role'
    }
    return config.role
  }, [config.role, config.customRole])

  const value = useMemo(
    () => ({
      config,
      setConfig,
      resetConfig,
      resolvedRole,
      resumeText,
      setResumeText,
      resumeFileName,
      setResumeFileName,
      clearResume,
    }),
    [
      config,
      setConfig,
      resetConfig,
      resolvedRole,
      resumeText,
      resumeFileName,
      clearResume,
    ]
  )

  return (
    <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>
  )
}

export function useInterview() {
  const ctx = useContext(InterviewContext)
  if (!ctx) throw new Error('useInterview must be used within InterviewProvider')
  return ctx
}
