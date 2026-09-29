import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const EXPERIENCE_OPTIONS = ['Student', 'Entry Level', '1–3 Years', '3+ Years']

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({
    name: '',
    title: '',
    bio: '',
    skills: '',
    experienceLevel: 'Student',
    education: '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || '',
      title: user.profile?.title || '',
      bio: user.profile?.bio || '',
      skills: user.profile?.skills || '',
      experienceLevel: user.profile?.experienceLevel || 'Student',
      education: user.profile?.education || '',
    })
  }, [user])

  const onChange = (key) => (e) => {
    setSaved(false)
    setError('')
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Full name is required')
      return
    }
    updateProfile({
      name: form.name.trim(),
      title: form.title,
      bio: form.bio,
      skills: form.skills,
      experienceLevel: form.experienceLevel,
      education: form.education,
    })
    setSaved(true)
  }

  const initial = (form.name || user?.name || 'U').charAt(0).toUpperCase()

  return (
    <div className="profile-page">
      <header className="setup-header">
        <p className="section-eyebrow">Profile</p>
        <h1>Your profile</h1>
        <p className="setup-lead">
          Manage how Intervia knows you. Changes are saved for this account.
        </p>
      </header>

      <div className="profile-layout">
        <aside className="profile-avatar-card">
          <div className="profile-avatar-lg">{initial}</div>
          <strong>{form.name || 'Your name'}</strong>
          <span className="profile-email">{user?.email}</span>
          {form.title && <span className="profile-title-tag">{form.title}</span>}
        </aside>

        <form className="profile-form dash-panel" onSubmit={handleSave}>
          <div className="field">
            <label htmlFor="prof-name">Full name</label>
            <input
              id="prof-name"
              type="text"
              value={form.name}
              onChange={onChange('name')}
              placeholder="Your full name"
            />
          </div>

          <div className="field">
            <label htmlFor="prof-email">Email</label>
            <input
              id="prof-email"
              type="email"
              value={user?.email || ''}
              disabled
              className="input-disabled"
            />
            <span className="field-hint">Email is tied to your account and cannot be changed here.</span>
          </div>

          <div className="field">
            <label htmlFor="prof-title">Professional title</label>
            <input
              id="prof-title"
              type="text"
              value={form.title}
              onChange={onChange('title')}
              placeholder="e.g. Aspiring Frontend Developer"
            />
          </div>

          <div className="field">
            <label htmlFor="prof-bio">About</label>
            <textarea
              id="prof-bio"
              rows={4}
              value={form.bio}
              onChange={onChange('bio')}
              placeholder="A short bio about your goals and background"
            />
          </div>

          <div className="field">
            <label htmlFor="prof-skills">Skills</label>
            <input
              id="prof-skills"
              type="text"
              value={form.skills}
              onChange={onChange('skills')}
              placeholder="e.g. React, JavaScript, SQL"
            />
          </div>

          <div className="field">
            <label htmlFor="prof-exp">Experience level</label>
            <select
              id="prof-exp"
              value={form.experienceLevel}
              onChange={onChange('experienceLevel')}
            >
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="prof-edu">Education</label>
            <input
              id="prof-edu"
              type="text"
              value={form.education}
              onChange={onChange('education')}
              placeholder="e.g. B.S. Computer Science"
            />
          </div>

          {error && <p className="field-error">{error}</p>}
          {saved && <p className="field-success">Profile saved.</p>}

          <button type="submit" className="btn-primary">
            Save profile
          </button>
        </form>
      </div>
    </div>
  )
}
