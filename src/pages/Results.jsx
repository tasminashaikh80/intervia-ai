import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getInterviewById, getLatestInterview } from '../utils/interviewStorage'
import { downloadInterviewPdf } from '../utils/pdfReport'

function ScoreRing({ score }) {
  const value = typeof score === 'number' ? score : 0
  const r = 54
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  return (
    <div className="score-ring">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="url(#scoreGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
        </defs>
      </svg>
      <div className="score-ring-label">
        <strong>{value}%</strong>
        <span>Overall Score</span>
      </div>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function scoreLabel(score) {
  if (score == null) return 'Insufficient evidence'
  return `${score}%`
}

export default function Results() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const result = useMemo(() => {
    if (id) return getInterviewById(id)
    return getLatestInterview()
  }, [id])

  const [openQ, setOpenQ] = useState(0)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')

  const handleDownloadPdf = async () => {
    if (!result || pdfBusy) return
    setPdfBusy(true)
    setPdfMsg('')
    try {
      await downloadInterviewPdf(result)
      setPdfMsg('PDF downloaded.')
    } catch (err) {
      console.error(err)
      setPdfMsg(err.message || 'Could not generate PDF.')
    } finally {
      setPdfBusy(false)
    }
  }

  if (!result) {
    return (
      <div className="results-page">
        <div className="placeholder-card" style={{ margin: '40px auto', maxWidth: 480 }}>
          <p className="section-eyebrow">Results</p>
          <h1>No result found</h1>
          <p>Complete an interview to see your feedback here.</p>
          <div className="placeholder-actions">
            <Link to="/interview" className="btn-primary">Start Interview</Link>
            <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  const scores = result.scores || {}
  const breakdown = [
    {
      key: 'technical',
      label: 'Technical Knowledge',
      score: scores.technical,
      hint: 'Depth and accuracy of role-related answers in the transcript',
    },
    {
      key: 'communication',
      label: 'Communication',
      score: scores.communication,
      hint: 'Clarity and structure demonstrated in spoken responses',
    },
    {
      key: 'relevance',
      label: 'Relevance',
      score: scores.relevance,
      hint: 'How well answers matched the questions asked',
    },
    {
      key: 'confidence',
      label: 'Confidence / Clarity',
      score: scores.confidence,
      hint: 'Fluency and assertiveness where evidence exists',
    },
  ]

  const endNote =
    result.endReason === 'time_expired'
      ? 'Ended when scheduled time expired'
      : result.endReason === 'immediate'
        ? 'Ended before meaningful answers were recorded'
        : result.endReason === 'user_ended'
          ? 'Ended by candidate'
          : result.endReason === 'connection_failed'
            ? 'Interrupted by connection failure'
            : result.status || 'Completed'

  return (
    <div className="results-page">
      <header className="results-header">
        <p className="section-eyebrow">Interview complete</p>
        <h1>{result.role} Interview</h1>
        <p className="results-meta">
          {result.interviewType || 'Mixed'}
          {result.date ? ` · ${formatDate(result.date)}` : ''}
          {' · '}
          {endNote}
        </p>
        {result.performanceLevel && (
          <p className="results-level">Performance level: <strong>{result.performanceLevel}</strong></p>
        )}
        {result.scoringMethod === 'ai' && (
          <p className="results-scoring-badge">AI Evaluated</p>
        )}
        {result.scoringMethod === 'heuristic' && (
          <p className="results-scoring-badge results-scoring-fallback">Fallback Evaluation</p>
        )}
      </header>

      <section className="results-score-block">
        <ScoreRing score={result.overallScore} />
        <div className="results-score-copy">
          <h2>Overall interview score</h2>
          <p>
            Evidence-based summary from this session&apos;s transcript only.
            Scores are not inflated when answers are missing or weak.
          </p>
          {result.evidence && (
            <p style={{ marginTop: 8, fontSize: 12, color: 'var(--dim)' }}>
              Evidence: {result.evidence.userTurns || 0} candidate turns ·{' '}
              {result.evidence.substantiveAnswers || 0} substantive answers ·{' '}
              {result.evidence.totalUserWords || 0} words
            </p>
          )}
        </div>
      </section>

      <section className="results-section">
        <h2 className="results-section-title">Performance breakdown</h2>
        <div className="results-breakdown">
          {breakdown.map((b) => (
            <article key={b.key} className="results-breakdown-card">
              <div className="results-breakdown-top">
                <strong>{b.label}</strong>
                <span>{scoreLabel(b.score)}</span>
              </div>
              <div className="dash-progress-track">
                <div
                  className="dash-progress-fill"
                  style={{
                    width: `${b.score != null ? Math.min(100, b.score) : 0}%`,
                    opacity: b.score == null ? 0.25 : 1,
                  }}
                />
              </div>
              <p>{b.score == null ? 'Insufficient evidence to evaluate this area.' : b.hint}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="results-section results-feedback-grid">
        <article className="results-feedback-card">
          <h3>What you did well</h3>
          {(result.strengths || []).length === 0 ? (
            <p className="results-q-text">No strengths recorded from this transcript.</p>
          ) : (
            <ul className="results-list positive">
              {result.strengths.map((s) => (
                <li key={s}>✓ {s}</li>
              ))}
            </ul>
          )}
        </article>
        <article className="results-feedback-card">
          <h3>Areas to improve</h3>
          <ul className="results-list improve">
            {(result.improvements || []).map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        </article>
      </section>

      {(result.notEvaluated || []).length > 0 && (
        <section className="results-section">
          <article className="results-overall-card" style={{ borderColor: 'rgba(148,163,184,0.25)' }}>
            <h3>Areas not evaluated</h3>
            <ul className="results-list">
              {result.notEvaluated.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </article>
        </section>
      )}

      <section className="results-section">
        <article className="results-overall-card">
          <h3>Evidence-based summary</h3>
          <p>{result.overallFeedback}</p>
          {result.recommendation && (
            <>
              <h3 style={{ marginTop: 16 }}>Recommendation</h3>
              <p>{result.recommendation}</p>
            </>
          )}
        </article>
      </section>

      {(result.questions || []).length > 0 && (
        <section className="results-section">
          <h2 className="results-section-title">Question review</h2>
          <div className="results-q-list">
            {result.questions.map((q, idx) => {
              const open = openQ === idx
              return (
                <div key={idx} className={`results-q-card ${open ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="results-q-toggle"
                    onClick={() => setOpenQ(open ? -1 : idx)}
                  >
                    <span>
                      Question {q.index || idx + 1}
                      {q.score != null ? ` · ${q.score}%` : ''}
                    </span>
                    <span>{open ? '−' : '+'}</span>
                  </button>
                  {open && (
                    <div className="results-q-body">
                      <p className="results-q-label">Question</p>
                      <p className="results-q-text">{q.question}</p>
                      <p className="results-q-label">Your answer</p>
                      <p className="results-q-text">{q.answer}</p>
                      <p className="results-q-label">Evaluation</p>
                      <p className="results-q-text">{q.evaluation}</p>
                      <p className="results-q-label">Suggested improvement</p>
                      <p className="results-q-text">{q.improvement}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="results-actions">
        <button type="button" className="btn-primary" onClick={handleDownloadPdf} disabled={pdfBusy}>
          {pdfBusy ? 'Generating PDF…' : 'Download PDF Report'}
        </button>
        <Link to="/interview" className="btn-secondary">Practice Again</Link>
        <Link to="/history" className="btn-secondary">View History</Link>
        <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
      </div>
      {pdfMsg && <p style={{ textAlign: 'center', marginTop: 12, color: 'var(--muted)' }}>{pdfMsg}</p>}
    </div>
  )
}
