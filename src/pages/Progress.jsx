import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAllInterviews, computeAggregateStats } from '../utils/interviewStorage'

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function Progress() {
  const interviews = useMemo(() => getAllInterviews(), [])
  const stats = useMemo(() => computeAggregateStats(interviews), [interviews])

  const skills = [
    { label: 'Technical Knowledge', value: stats.technical },
    { label: 'Communication', value: stats.communication },
    { label: 'Relevance', value: stats.relevance },
    { label: 'Confidence', value: stats.confidence },
  ]

  if (interviews.length === 0) {
    return (
      <div className="progress-page">
        <header className="setup-header">
          <p className="section-eyebrow">Progress</p>
          <h1>Your Progress</h1>
        </header>
        <div className="placeholder-card" style={{ maxWidth: 480 }}>
          <p>Complete your first interview to start tracking your performance.</p>
          <div className="placeholder-actions">
            <Link to="/interview" className="btn-primary">Start Interview</Link>
          </div>
        </div>
      </div>
    )
  }

  const maxTrend = Math.max(...stats.scoreTrend.map((t) => t.score), 100)

  return (
    <div className="progress-page">
      <header className="setup-header">
        <p className="section-eyebrow">Progress</p>
        <h1>Your Progress</h1>
        <p className="setup-lead">Stats calculated from your saved interview results.</p>
      </header>

      <div className="dash-stats">
        <article className="dash-stat-card">
          <p className="dash-stat-label">Total Interviews</p>
          <p className="dash-stat-value">{stats.totalInterviews}</p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Average Score</p>
          <p className="dash-stat-value">
            {stats.averageScore != null ? `${stats.averageScore}%` : '—'}
          </p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Best Score</p>
          <p className="dash-stat-value">
            {stats.bestScore != null ? `${stats.bestScore}%` : '—'}
          </p>
        </article>
        <article className="dash-stat-card">
          <p className="dash-stat-label">Latest Score</p>
          <p className="dash-stat-value">
            {stats.latestScore != null ? `${stats.latestScore}%` : '—'}
          </p>
        </article>
      </div>

      <section className="dash-panel" style={{ marginBottom: 20 }}>
        <div className="dash-panel-head">
          <h2>Score trend</h2>
        </div>
        <div className="trend-chart">
          {stats.scoreTrend.map((t) => (
            <div key={t.id} className="trend-bar-wrap" title={`${t.role}: ${t.score}%`}>
              <div
                className="trend-bar"
                style={{ height: `${(t.score / maxTrend) * 100}%` }}
              />
              <span className="trend-label">{t.score}%</span>
              <span className="trend-date">{formatDate(t.date)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dash-panel" style={{ marginBottom: 20 }}>
        <div className="dash-panel-head">
          <h2>Skill breakdown</h2>
        </div>
        <div className="dash-progress-bars">
          {skills.map((s) => (
            <div key={s.label} className="dash-progress-row" style={{ gridTemplateColumns: '140px 1fr 48px' }}>
              <span className="dash-progress-label">{s.label}</span>
              <div className="dash-progress-track">
                <div
                  className="dash-progress-fill"
                  style={{ width: `${s.value != null ? s.value : 0}%` }}
                />
              </div>
              <span className="dash-progress-pct">
                {s.value != null ? `${s.value}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="dash-panel">
        <div className="dash-panel-head">
          <h2>Recent performance</h2>
          <Link to="/history" className="link-accent">View all</Link>
        </div>
        <ul className="dash-interview-list">
          {interviews.slice(0, 5).map((item) => (
            <li key={item.id} className="dash-interview-row">
              <div className="dash-interview-info">
                <strong>{item.role}</strong>
                <span>{formatDate(item.date)} · {item.interviewType}</span>
              </div>
              <div className="dash-interview-meta">
                <span className="dash-score">{item.overallScore}%</span>
                <Link
                  to={`/results?id=${encodeURIComponent(item.id)}`}
                  className="btn-secondary btn-sm"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
