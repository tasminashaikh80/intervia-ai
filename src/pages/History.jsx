import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAllInterviews, deleteInterview } from '../utils/interviewStorage'

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function History() {
  const [interviews, setInterviews] = useState(() => getAllInterviews())
  const [confirmId, setConfirmId] = useState(null)

  const refresh = useCallback(() => {
    setInterviews(getAllInterviews())
  }, [])

  const handleDelete = (id) => {
    deleteInterview(id)
    setConfirmId(null)
    refresh()
  }

  return (
    <div className="history-page">
      <header className="setup-header">
        <p className="section-eyebrow">History</p>
        <h1>Interview History</h1>
        <p className="setup-lead">Review past practice sessions and open detailed results.</p>
      </header>

      {interviews.length === 0 ? (
        <div className="placeholder-card" style={{ maxWidth: 480 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>No interviews yet</h2>
          <p>Complete your first AI interview to start tracking your progress.</p>
          <div className="placeholder-actions">
            <Link to="/interview" className="btn-primary">Start Interview</Link>
          </div>
        </div>
      ) : (
        <ul className="history-list">
          {interviews.map((item) => (
            <li key={item.id} className="history-card">
              <div className="history-card-main">
                <strong>{item.role}</strong>
                <span className="history-card-meta">
                  {item.interviewType || 'Mixed'} Interview
                  {item.date ? ` · ${formatDate(item.date)}` : ''}
                </span>
                <span className="history-status">{item.status || 'Completed'}</span>
              </div>
              <div className="history-card-side">
                <span className="dash-score">{item.overallScore}%</span>
                <Link
                  to={`/results?id=${encodeURIComponent(item.id)}`}
                  className="btn-secondary btn-sm"
                >
                  View Results
                </Link>
                <button
                  type="button"
                  className="btn-danger-ghost btn-sm"
                  onClick={() => setConfirmId(item.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmId && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h3>Delete this interview?</h3>
            <p>This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => handleDelete(confirmId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
