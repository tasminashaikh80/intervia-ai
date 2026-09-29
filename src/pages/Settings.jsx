import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { getSettings, saveSettings, defaultSettings } from '../utils/settingsStorage'

export default function Settings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState(() => getSettings())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSettings(getSettings())
  }, [])

  const update = (key, value) => {
    setSaved(false)
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      saveSettings(next)
      return next
    })
    setSaved(true)
  }

  const resetDefaults = () => {
    saveSettings(defaultSettings)
    setSettings({ ...defaultSettings })
    setSaved(true)
  }

  return (
    <div className="settings-page">
      <header className="setup-header">
        <p className="section-eyebrow">Settings</p>
        <h1>Settings</h1>
        <p className="setup-lead">Preferences for your Intervia experience. Saved on this device.</p>
      </header>

      <section className="dash-panel settings-section">
        <h2>Account</h2>
        <div className="settings-row">
          <div>
            <strong>Name</strong>
            <p>{user?.name || '—'}</p>
          </div>
        </div>
        <div className="settings-row">
          <div>
            <strong>Email</strong>
            <p>{user?.email || '—'}</p>
          </div>
        </div>
        <p className="field-hint">Edit name and profile details on the Profile page.</p>
      </section>

      <section className="dash-panel settings-section">
        <h2>Notifications</h2>
        <label className="settings-toggle">
          <span>
            <strong>Email notifications</strong>
            <small>Product updates and tips (frontend preference for now)</small>
          </span>
          <input
            type="checkbox"
            checked={!!settings.emailNotifications}
            onChange={(e) => update('emailNotifications', e.target.checked)}
          />
        </label>
        <label className="settings-toggle">
          <span>
            <strong>Interview reminders</strong>
            <small>Reminders to practice regularly</small>
          </span>
          <input
            type="checkbox"
            checked={!!settings.interviewReminders}
            onChange={(e) => update('interviewReminders', e.target.checked)}
          />
        </label>
        <label className="settings-toggle">
          <span>
            <strong>Result alerts</strong>
            <small>Notify when a session result is ready</small>
          </span>
          <input
            type="checkbox"
            checked={!!settings.resultAlerts}
            onChange={(e) => update('resultAlerts', e.target.checked)}
          />
        </label>
      </section>

      <section className="dash-panel settings-section">
        <h2>Interview preferences</h2>
        <div className="field">
          <label htmlFor="set-diff">Preferred difficulty</label>
          <select
            id="set-diff"
            value={settings.preferredDifficulty}
            onChange={(e) => update('preferredDifficulty', e.target.value)}
          >
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Advanced</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="set-dur">Preferred duration (minutes)</label>
          <select
            id="set-dur"
            value={settings.preferredDuration}
            onChange={(e) => update('preferredDuration', Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </div>
        <label className="settings-toggle">
          <span>
            <strong>Auto-scroll transcript</strong>
            <small>Keep the latest message visible during live interviews</small>
          </span>
          <input
            type="checkbox"
            checked={!!settings.autoScrollTranscript}
            onChange={(e) => update('autoScrollTranscript', e.target.checked)}
          />
        </label>
      </section>

      <section className="dash-panel settings-section">
        <h2>Appearance</h2>
        <label className="settings-toggle">
          <span>
            <strong>Reduce motion</strong>
            <small>Prefer fewer animations (stored preference)</small>
          </span>
          <input
            type="checkbox"
            checked={!!settings.reduceMotion}
            onChange={(e) => update('reduceMotion', e.target.checked)}
          />
        </label>
        <p className="field-hint">Intervia uses a dark theme by design.</p>
      </section>

      <section className="dash-panel settings-section">
        <h2>Data</h2>
        <p className="field-hint" style={{ marginBottom: 12 }}>
          Interview history is stored in this browser. Deleting history is available on the History page.
        </p>
        <button type="button" className="btn-secondary" onClick={resetDefaults}>
          Reset settings to defaults
        </button>
      </section>

      {saved && <p className="field-success">Settings saved.</p>}
    </div>
  )
}
