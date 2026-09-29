import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInterview } from '../context/InterviewContext'
import { extractTextFromPdf } from '../utils/resumeExtract'

const ROLES = [
  { id: 'Junior Web Developer', icon: '⌘', title: 'Junior Web Developer', description: 'Frontend and basic web development interview.' },
  { id: 'Frontend Developer', icon: '◈', title: 'Frontend Developer', description: 'React, JavaScript, HTML, CSS and frontend concepts.' },
  { id: 'Backend Developer', icon: '⬡', title: 'Backend Developer', description: 'APIs, databases, server-side development and backend concepts.' },
  { id: 'Software Engineer', icon: '✦', title: 'Software Engineer', description: 'General software engineering and problem-solving questions.' },
  { id: 'Data Analyst', icon: '◉', title: 'Data Analyst', description: 'Data analysis, SQL, Excel and analytical thinking.' },
  { id: 'Chemistry Teacher', icon: '⚗', title: 'Chemistry Teacher', description: 'Chemistry teaching knowledge, labs, and classroom scenarios.' },
  { id: 'Custom Role', icon: '✎', title: 'Custom Role', description: 'Enter your own role for a tailored interview.' },
]

const INTERVIEW_TYPES = [
  { id: 'Technical', label: 'Technical', desc: 'Technical knowledge and role-specific questions.' },
  { id: 'Behavioral', label: 'Behavioral', desc: 'Communication, teamwork, problem-solving and experience-based questions.' },
  { id: 'HR', label: 'HR', desc: 'Common HR and workplace questions.' },
  { id: 'Mixed', label: 'Mixed', desc: 'A balanced combination of technical, behavioral and HR questions.' },
]

const DIFFICULTIES = [
  { id: 'Beginner', label: 'Beginner', desc: 'Good for students and first-time practice.' },
  { id: 'Intermediate', label: 'Intermediate', desc: 'Realistic entry-level interview difficulty.' },
  { id: 'Advanced', label: 'Advanced', desc: 'Challenging questions for stronger candidates.' },
]

const EXPERIENCE = [
  { id: 'Student', label: 'Student', desc: 'Currently studying or preparing for your first professional role.' },
  { id: 'Entry Level', label: 'Entry Level', desc: 'Little or no professional experience.' },
  { id: '1–3 Years', label: '1–3 Years', desc: 'Some professional experience.' },
  { id: '3+ Years', label: '3+ Years', desc: 'Experienced professional.' },
]

const DURATIONS = [
  { id: 10, label: '10 min', desc: 'Quick practice' },
  { id: 20, label: '20 min', desc: 'Standard practice' },
  { id: 30, label: '30 min', desc: 'Full practice' },
]

export default function InterviewSetup() {
  const navigate = useNavigate()
  const {
    config,
    setConfig,
    resolvedRole,
    resumeText,
    setResumeText,
    resumeFileName,
    setResumeFileName,
    clearResume,
  } = useInterview()
  const [error, setError] = useState('')
  const [resumeStatus, setResumeStatus] = useState('')
  const [resumeBusy, setResumeBusy] = useState(false)

  const selectRole = (id) => {
    setError('')
    setConfig({ role: id, ...(id !== 'Custom Role' ? { customRole: '' } : {}) })
  }

  const handleResume = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setResumeBusy(true)
    setResumeStatus('')
    try {
      const text = await extractTextFromPdf(file)
      setResumeText(text)
      setResumeFileName(file.name)
      setResumeStatus(`Loaded “${file.name}” (${text.length.toLocaleString()} characters). Used only for this session — not stored permanently.`)
    } catch (err) {
      clearResume()
      setResumeStatus(err.message || 'Could not read this PDF. You can continue without resume tailoring.')
    } finally {
      setResumeBusy(false)
    }
  }

  const handleStart = () => {
    if (!config.role) {
      setError('Please select a role to continue.')
      return
    }
    if (config.role === 'Custom Role' && !config.customRole.trim()) {
      setError('Please enter your role to continue.')
      return
    }
    setError('')
    navigate('/interview/precheck')
  }

  const summaryRole =
    config.role === 'Custom Role'
      ? config.customRole.trim() || '—'
      : config.role

  return (
    <div className="setup-page">
      <Link to="/dashboard" className="setup-back">
        ← Back to Dashboard
      </Link>

      <header className="setup-header">
        <p className="section-eyebrow">New interview</p>
        <h1>Set up your interview</h1>
        <p className="setup-lead">
          Customize your interview so Intervia can create the right practice experience for you.
        </p>
      </header>

      <div className="setup-layout">
        <div className="setup-main">
          <section className="setup-section">
            <h2 className="setup-section-title">What role are you preparing for?</h2>
            <div className="setup-role-grid">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`setup-role-card ${config.role === r.id ? 'selected' : ''}`}
                  onClick={() => selectRole(r.id)}
                >
                  <span className="setup-role-icon">{r.icon}</span>
                  <strong>{r.title}</strong>
                  <span className="setup-role-desc">{r.description}</span>
                </button>
              ))}
            </div>
            {config.role === 'Custom Role' && (
              <div className="setup-custom-field">
                <label htmlFor="custom-role">Enter your role</label>
                <input
                  id="custom-role"
                  type="text"
                  placeholder="e.g. UI/UX Designer"
                  value={config.customRole}
                  onChange={(e) => {
                    setError('')
                    setConfig({ customRole: e.target.value })
                  }}
                />
              </div>
            )}
          </section>

          <section className="setup-section">
            <h2 className="setup-section-title">What type of interview?</h2>
            <div className="setup-chip-grid">
              {INTERVIEW_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`setup-chip-card ${config.interviewType === t.id ? 'selected' : ''}`}
                  onClick={() => setConfig({ interviewType: t.id })}
                >
                  <strong>{t.label}</strong>
                  <span>{t.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <h2 className="setup-section-title">Choose difficulty</h2>
            <div className="setup-chip-grid setup-chip-3">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`setup-chip-card ${config.difficulty === d.id ? 'selected' : ''}`}
                  onClick={() => setConfig({ difficulty: d.id })}
                >
                  <strong>{d.label}</strong>
                  <span>{d.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <h2 className="setup-section-title">Your experience level</h2>
            <div className="setup-chip-grid">
              {EXPERIENCE.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`setup-chip-card ${config.experienceLevel === e.id ? 'selected' : ''}`}
                  onClick={() => setConfig({ experienceLevel: e.id })}
                >
                  <strong>{e.label}</strong>
                  <span>{e.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <h2 className="setup-section-title">Interview length</h2>
            <div className="setup-duration-row">
              {DURATIONS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`setup-duration-card ${config.duration === d.id ? 'selected' : ''}`}
                  onClick={() => setConfig({ duration: d.id })}
                >
                  <strong>{d.label}</strong>
                  <span>{d.desc}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <h2 className="setup-section-title">Resume (optional)</h2>
            <p className="setup-lead" style={{ marginBottom: 12 }}>
              Upload a PDF so the interviewer can ask about your real experience. Processing stays in your browser for this session only — nothing is stored permanently by Intervia.
            </p>
            <div className="resume-upload-row">
              <label className="btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                {resumeBusy ? 'Reading PDF…' : 'Upload PDF resume'}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  hidden
                  disabled={resumeBusy}
                  onChange={handleResume}
                />
              </label>
              {resumeText && (
                <button type="button" className="btn-danger-ghost btn-sm" onClick={() => { clearResume(); setResumeStatus('') }}>
                  Remove
                </button>
              )}
            </div>
            {resumeFileName && (
              <p style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>File: {resumeFileName}</p>
            )}
            {resumeStatus && (
              <p style={{ marginTop: 8, fontSize: 13, color: resumeText ? 'var(--success, #10b981)' : 'var(--dim)' }}>
                {resumeStatus}
              </p>
            )}
          </section>
        </div>

        <aside className="setup-summary-wrap">
          <div className="setup-summary">
            <h2>Your interview</h2>
            <dl className="setup-summary-list">
              <div>
                <dt>Role</dt>
                <dd>{summaryRole}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{config.interviewType}</dd>
              </div>
              <div>
                <dt>Difficulty</dt>
                <dd>{config.difficulty}</dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>{config.experienceLevel}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{config.duration} minutes</dd>
              </div>
              <div>
                <dt>Resume</dt>
                <dd>{resumeText ? 'Attached (session only)' : 'None'}</dd>
              </div>
            </dl>

            {error && <p className="setup-error">{error}</p>}

            <button type="button" className="btn-primary btn-auth setup-start-btn" onClick={handleStart}>
              Continue
              <span className="btn-arrow">→</span>
            </button>
            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--dim)', textAlign: 'center' }}>
              Next: pre-interview check
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
