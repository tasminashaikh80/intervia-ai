import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getAllInterviews,
  getLatestInterview,
  computeAggregateStats,
} from '../utils/interviewStorage'

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

const recommendations = [
  { title: 'Behavioral Questions', desc: 'Practice communication and confidence.' },
  { title: 'Technical Questions', desc: 'Test your technical knowledge.' },
  { title: 'HR Interview', desc: 'Practice common HR questions.' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const interviews = useMemo(() => getAllInterviews(), [])
  const latest = useMemo(() => getLatestInterview(), [])
  const stats = useMemo(() => computeAggregateStats(interviews), [interviews])

  const prevScore =
    interviews.length >= 2 ? interviews[1].overallScore : null
  const delta =
    latest && prevScore != null && typeof latest.overallScore === 'number'
      ? latest.overallScore - prevScore
      : null

  const statCards = [
    { label: 'Total Interviews', value: String(stats.totalInterviews) },
    {
      label: 'Average Score',
      value: stats.averageScore != null ? `${stats.averageScore}%` : '—',
    },
    {
      label: 'Latest Score',
      value: stats.latestScore != null ? `${stats.latestScore}%` : '—',
    },
    {
      label: 'Best Score',
      value: stats.bestScore != null ? `${stats.bestScore}%` : '—',
    },
  ]

  return (
    <div className="dash-overview">
      <div className="dash-stats">
        {statCards.map((s) => (
          <article key={s.label} className="dash-stat-card">
            <p className="dash-stat-label">{s.label}</p>
            <p className="dash-stat-value">{s.value}</p>
          </article>
        ))}
      </div>

      <section className="dash-cta-card">
        <div>
          <h2>Ready for your next interview?</h2>
          <p>Practice a realistic AI-powered voice interview and improve your confidence.</p>
        </div>
        <Link to="/interview" className="btn-primary btn-lg">
          Start New Interview
          <span className="btn-arrow">→</span>
        </Link>
      </section>

      <div className="dash-grid-2">
        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Latest interview</h2>
            {latest && (
              <Link
                to={`/results?id=${encodeURIComponent(latest.id)}`}
                className="link-accent"
              >
                View Results
              </Link>
            )}
          </div>

          {!latest ? (
            <div className="dash-empty">
              <p className="dash-empty-title">No interviews yet</p>
              <p className="dash-empty-text">
                Complete your first AI interview and your interview history will appear here.
              </p>
              <Link to="/interview" className="btn-primary btn-sm" style={{ marginTop: 12 }}>
                Start New Interview
              </Link>
            </div>
          ) : (
            <div className="dash-latest">
              <strong>{latest.role}</strong>
              <p>
                {latest.interviewType} · {formatDate(latest.date)} · {latest.status}
              </p>
              <div className="dash-latest-score">
                <span className="dash-score" style={{ fontSize: 28 }}>
                  {latest.overallScore}%
                </span>
                {delta != null && (
                  <span className={delta >= 0 ? 'delta-up' : 'delta-down'}>
                    {delta >= 0 ? '+' : ''}
                    {delta}% vs previous
                  </span>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel-head">
            <h2>Progress</h2>
            <Link to="/progress" className="link-accent">Details</Link>
          </div>
          {stats.totalInterviews === 0 ? (
            <div className="dash-empty">
              <p className="dash-empty-title">No progress data yet</p>
              <p className="dash-empty-text">
                Complete your first interview to start tracking your performance.
              </p>
            </div>
          ) : (
            <div className="dash-empty">
              <p className="dash-empty-text">
                <strong>{stats.totalInterviews}</strong> interview
                {stats.totalInterviews === 1 ? '' : 's'} completed
              </p>
              <p className="dash-empty-text" style={{ marginTop: 8 }}>
                Average score{' '}
                <strong>
                  {stats.averageScore != null ? `${stats.averageScore}%` : '—'}
                </strong>
              </p>
              {delta != null && (
                <p className="dash-empty-text" style={{ marginTop: 8 }}>
                  Latest change{' '}
                  <strong className={delta >= 0 ? 'delta-up' : 'delta-down'}>
                    {delta >= 0 ? '+' : ''}
                    {delta}%
                  </strong>
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className="dash-panel" style={{ marginTop: 24 }}>
        <div className="dash-panel-head">
          <h2>Recent interviews</h2>
          {interviews.length > 0 && (
            <Link to="/history" className="link-accent">View all</Link>
          )}
        </div>
        {interviews.length === 0 ? (
          <p className="dash-empty-text">No saved sessions yet.</p>
        ) : (
          <ul className="dash-interview-list">
            {interviews.slice(0, 4).map((item) => (
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
        )}
      </section>

      <section className="dash-panel" style={{ marginTop: 24 }}>
        <div className="dash-panel-head">
          <h2>Recommended Practice</h2>
        </div>
        <div className="dash-recommend-grid">
          {recommendations.map((r) => (
            <article key={r.title} className="dash-recommend-card">
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
              <Link to="/interview" className="link-accent">Practice →</Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
