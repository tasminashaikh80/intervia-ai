import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInterview } from '../context/InterviewContext'
import { useVoiceAgent } from '../useVoiceAgent'
import { analyzeInterview } from '../utils/interviewAnalysis'
import { scoreInterviewWithAI } from '../utils/aiScoring'
import { saveInterview } from '../utils/interviewStorage'
import { getQuestionBank } from '../questionBanks'
import { generateInterviewIntroduction } from '../utils/interviewIntroduction'

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

function endScreenCopy(reason) {
  switch (reason) {
    case 'user_ended':
      return {
        title: 'Interview Ended',
        body: 'You ended this interview session. Your responses have been saved and are ready to review.',
      }
    case 'time_expired':
      return {
        title: "Time's Up",
        body: 'Your scheduled interview time has ended. Your responses have been saved.',
      }
    case 'connection_failed':
    case 'failed':
      return {
        title: 'Interview Interrupted',
        body: "We couldn't maintain the interview connection. Available transcript and results have been preserved where possible.",
      }
    case 'immediate':
      return {
        title: 'Interview Ended',
        body: 'This session ended before enough answers were recorded. You can still open the report for what was collected.',
      }
    case 'completed':
    default:
      return {
        title: 'Interview Complete',
        body: 'Your interview is complete. Your performance report is ready.',
      }
  }
}

/** Simple text-mode interviewer using curated questions (no external AI required for fallback). */
function useTextInterviewer() {
  const bankRef = useRef([])
  const indexRef = useRef(0)
  const [agentText, setAgentText] = useState('')
  const [busy, setBusy] = useState(false)

  const start = useCallback((role, options = {}) => {
    const bank = getQuestionBank(role, options.interviewType, options.difficulty)
    bankRef.current = bank.questions || []
    indexRef.current = 0
    const firstQ = bankRef.current[0]?.text || ''
    const { greeting, firstQuestionHint } = generateInterviewIntroduction({
      role,
      interviewType: options.interviewType,
      difficulty: options.difficulty,
      resumeContext: options.resumeText || '',
      firstQuestion: firstQ,
    })
    indexRef.current = bankRef.current[0] ? 1 : 0
    const opening = firstQuestionHint && !greeting.includes(firstQuestionHint.slice(0, 40))
      ? `${greeting} ${firstQuestionHint}`
      : greeting
    setAgentText(opening)
    return opening
  }, [])

  const respond = useCallback(async (userText) => {
    setBusy(true)
    // Brief delay for UX
    await new Promise((r) => setTimeout(r, 400))
    const next = bankRef.current[indexRef.current]
    indexRef.current += 1
    let reply
    if (!userText || userText.trim().length < 3) {
      reply = 'Could you say a bit more about that?'
    } else if (next) {
      reply = next.text
    } else {
      reply = "That's all I had planned for this session. You can end the interview whenever you're ready."
    }
    setAgentText(reply)
    setBusy(false)
    return reply
  }, [])

  const stop = useCallback(() => {
    setAgentText('')
    setBusy(false)
  }, [])

  return { start, respond, stop, agentText, busy }
}

export default function InterviewLive() {
  const navigate = useNavigate()
  const { config, resolvedRole, resumeText, clearResume } = useInterview()
  const isText = config.mode === 'text'

  const [messages, setMessages] = useState([])
  const [started, setStarted] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [endScreen, setEndScreen] = useState(null) // { reason, resultId, summary }
  const [phase, setPhase] = useState('idle')
  const [remainingSec, setRemainingSec] = useState(() => (config.duration || 20) * 60)
  const [showExtend, setShowExtend] = useState(false)
  const [warnedNearEnd, setWarnedNearEnd] = useState(false)
  const [textInput, setTextInput] = useState('')
  const startedAtRef = useRef(null)
  const messagesRef = useRef([])
  const remainingRef = useRef((config.duration || 20) * 60)
  const endReasonRef = useRef('completed')

  const {
    start: startVoice,
    stop: stopVoice,
    pause,
    resume,
    retryReconnect,
    connected,
    paused,
    transcript,
    agentText,
    error,
    connectionStatus,
  } = useVoiceAgent()

  const textAgent = useTextInterviewer()

  const previousTranscriptRef = useRef('')
  const previousAgentTextRef = useRef('')
  const chatEndRef = useRef(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    remainingRef.current = remainingSec
  }, [remainingSec])

  useEffect(() => {
    if (isText) {
      if (started && !finishing) setPhase(textAgent.busy ? 'live' : 'live')
      return
    }
    if (connected && !paused) setPhase('live')
    else if (paused) setPhase('paused')
  }, [connected, paused, isText, started, finishing, textAgent.busy])

  // Voice transcript → messages
  // AssemblyAI sends transcript.user once per finalized turn (not a streaming draft).
  // Consecutive user turns (pause mid-answer then continue before agent replies)
  // must APPEND, not replace — otherwise the first segment is discarded.
  useEffect(() => {
    if (isText) return
    const text = transcript?.trim()
    if (!text) return
    if (text === previousTranscriptRef.current) return
    previousTranscriptRef.current = text
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.sender === 'user') {
        // Same-turn refinement is rare; consecutive finalized turns are common.
        // Append so mid-thought pauses never wipe earlier speech.
        const merged = `${last.text} ${text}`.trim()
        if (merged === last.text) return prev
        return [...prev.slice(0, -1), { ...last, text: merged }]
      }
      return [...prev, { id: `user-${Date.now()}`, sender: 'user', text }]
    })
  }, [transcript, isText])

  useEffect(() => {
    if (isText) return
    const text = agentText?.trim()
    if (!text) return
    if (text === previousAgentTextRef.current) return
    previousAgentTextRef.current = text
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.sender === 'ai') {
        return [...prev.slice(0, -1), { ...last, text }]
      }
      return [...prev, { id: `ai-${Date.now()}`, sender: 'ai', text }]
    })
  }, [agentText, isText])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages])

  useEffect(() => {
    if (!started || finishing) return
    if (!isText && (!connected || paused)) return
    const id = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          return 0
        }
        if (prev === 90 && !warnedNearEnd) {
          setWarnedNearEnd(true)
        }
        if (prev === 30) {
          setShowExtend(true)
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [started, connected, paused, finishing, warnedNearEnd, isText])

  useEffect(() => {
    if (started && remainingSec === 0 && !finishing && (isText || connected)) {
      endReasonRef.current = 'time_expired'
      setShowExtend(true)
    }
  }, [remainingSec, started, finishing, connected, isText])

  useEffect(() => {
    return () => {
      if (!isText) stopVoice()
      else textAgent.stop()
      clearResume()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const interviewBrief = [
    resolvedRole,
    config.interviewType ? `${config.interviewType} style` : null,
    config.difficulty ? `${config.difficulty} difficulty` : null,
    config.experienceLevel ? `candidate level: ${config.experienceLevel}` : null,
  ]
    .filter(Boolean)
    .join(' — ')

  const handleStart = () => {
    setMessages([])
    previousTranscriptRef.current = ''
    previousAgentTextRef.current = ''
    setStarted(true)
    setPhase('connecting')
    setShowExtend(false)
    setWarnedNearEnd(false)
    endReasonRef.current = 'completed'
    const secs = (config.duration || 20) * 60
    setRemainingSec(secs)
    remainingRef.current = secs
    startedAtRef.current = Date.now()

    if (isText) {
      const opening = textAgent.start(resolvedRole, {
        duration: config.duration,
        interviewType: config.interviewType,
        difficulty: config.difficulty,
        resumeText: resumeText || '',
      })
      setMessages([{ id: `ai-${Date.now()}`, sender: 'ai', text: opening }])
      setPhase('live')
      return
    }

    console.log('[Intervia Voice] Starting role:', resolvedRole, interviewBrief)
    startVoice(resolvedRole, {
      duration: config.duration,
      interviewType: config.interviewType,
      difficulty: config.difficulty,
      experienceLevel: config.experienceLevel,
      resumeText: resumeText || '',
    })
  }

  const handleTextSend = async () => {
    const text = textInput.trim()
    if (!text || textAgent.busy || finishing) return
    setTextInput('')
    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, sender: 'user', text }])
    const reply = await textAgent.respond(text)
    setMessages((prev) => [...prev, { id: `ai-${Date.now()}`, sender: 'ai', text: reply }])
  }

  const handlePause = () => {
    if (isText) return
    pause()
    setPhase('paused')
  }

  const handleResume = () => {
    if (isText) return
    resume()
    setPhase('live')
  }

  const finishInterview = useCallback(
    async (reason) => {
      if (finishing) return
      setFinishing(true)
      setPhase('ending')
      endReasonRef.current = reason || endReasonRef.current || 'user_ended'
      if (isText) textAgent.stop()
      else stopVoice()

      const snapshot = messagesRef.current
      const elapsedMin = startedAtRef.current
        ? Math.max(0, Math.round((Date.now() - startedAtRef.current) / 60000))
        : 0

      if (
        snapshot.filter((m) => m.sender === 'user').length === 0 &&
        elapsedMin < 1
      ) {
        endReasonRef.current = 'immediate'
      }

      const interviewMeta = {
        role: resolvedRole,
        interviewType: config.interviewType,
        difficulty: config.difficulty,
        experienceLevel: config.experienceLevel,
        duration: config.duration,
        messages: snapshot,
        endReason: endReasonRef.current,
        actualMinutes: elapsedMin,
      }

      const plannedSec = (config.duration || 20) * 60
      const usedSec = Math.max(0, plannedSec - remainingRef.current)
      const userTurns = snapshot.filter((m) => m.sender === 'user').length
      const resultId = `iv_${Date.now()}`

      // Show end screen immediately with scoring-in-progress state
      setEndScreen({
        reason: endReasonRef.current,
        resultId,
        scoring: true,
        summary: {
          role: resolvedRole,
          interviewType: config.interviewType,
          difficulty: config.difficulty,
          plannedMin: config.duration,
          elapsedMin,
          usedSec,
          plannedSec,
          questionsAnswered: userTurns,
          overallScore: null,
        },
      })
      setPhase('ended')

      let analysis
      let scoringMethod = 'heuristic'

      try {
        analysis = await scoreInterviewWithAI(interviewMeta)
        scoringMethod = 'ai'
      } catch (err) {
        console.error('AI scoring failed, using heuristic fallback:', err)
        analysis = {
          ...analyzeInterview(interviewMeta),
          scoringMethod: 'heuristic',
        }
        scoringMethod = 'heuristic'
      }

      // Evidence block for UI (heuristic provides it; AI may not)
      const evidence =
        analysis.evidence ||
        (() => {
          const userAnswers = snapshot.filter((m) => m.sender === 'user')
          const totalUserWords = userAnswers.reduce(
            (sum, m) => sum + (m.text || '').trim().split(/\s+/).filter(Boolean).length,
            0
          )
          return {
            aiTurns: snapshot.filter((m) => m.sender === 'ai').length,
            userTurns: userAnswers.length,
            substantiveAnswers: userAnswers.filter(
              (m) => (m.text || '').trim().split(/\s+/).filter(Boolean).length >= 5
            ).length,
            totalUserWords,
          }
        })()

      const result = {
        id: resultId,
        role: resolvedRole,
        interviewType: config.interviewType,
        difficulty: config.difficulty,
        experienceLevel: config.experienceLevel,
        duration: config.duration,
        actualMinutes: elapsedMin,
        date: new Date().toISOString(),
        status: 'Completed',
        mode: isText ? 'text' : 'voice',
        endReason: endReasonRef.current,
        overallScore: analysis.overallScore,
        performanceLevel: analysis.performanceLevel,
        scores: analysis.scores,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        notEvaluated: analysis.notEvaluated,
        overallFeedback: analysis.overallFeedback,
        recommendation: analysis.recommendation,
        questions: analysis.questions,
        evidence,
        messageCount: snapshot.length,
        transcript: snapshot,
        scoringMethod,
      }

      saveInterview(result)
      clearResume()

      setEndScreen((prev) =>
        prev
          ? {
              ...prev,
              scoring: false,
              summary: {
                ...prev.summary,
                overallScore: analysis.overallScore,
              },
            }
          : prev
      )
    },
    [finishing, stopVoice, resolvedRole, config, isText, textAgent, clearResume]
  )

  const handleEnd = () => {
    finishInterview('user_ended')
  }

  const handleExtend = (mins) => {
    setRemainingSec((prev) => prev + mins * 60)
    setShowExtend(false)
    endReasonRef.current = 'completed'
    if (!isText && paused) handleResume()
  }

  const statusLabel = (() => {
    if (connectionStatus === 'ended') return 'Ended'
    if (connectionStatus === 'lost') return 'Connection lost'
    if (connectionStatus === 'reconnecting') return 'Reconnecting…'
    if (connectionStatus === 'restored') return 'Connection restored'
    if (connectionStatus === 'failed') return 'Unable to reconnect'
    if (error) return 'Error'
    if (isText && started) return textAgent.busy ? 'Thinking…' : 'Your turn'
    if (phase === 'connecting' && !connected) return 'Connecting…'
    if (phase === 'paused' || paused) return 'Paused'
    if (phase === 'ending') return 'Ending…'
    if (connected) return 'Listening'
    if (started && !connected) return 'Disconnected'
    return 'Ready'
  })()

  const showReconnectBanner =
    !isText &&
    started &&
    !finishing &&
    (connectionStatus === 'lost' ||
      connectionStatus === 'reconnecting' ||
      connectionStatus === 'restored' ||
      connectionStatus === 'failed')

  if (endScreen) {
    const copy = endScreenCopy(endScreen.reason)
    const s = endScreen.summary || {}
    const isScoring = !!endScreen.scoring
    return (
      <main className="app live-mode">
        <div className="bg-glow bg-glow-1"></div>
        <div className="bg-glow bg-glow-2"></div>
        <div className="end-screen">
          <div className="end-screen-card">
            <div className="end-screen-icon" aria-hidden="true">{isScoring ? '…' : '✓'}</div>
            <p className="section-eyebrow">{isScoring ? 'Evaluating' : 'Session closed'}</p>
            <h1>{isScoring ? 'Generating your interview evaluation…' : copy.title}</h1>
            {isScoring ? (
              <div className="end-screen-body scoring-progress">
                <p>Analyzing your answers</p>
                <p>Reviewing technical accuracy</p>
                <p>Evaluating communication</p>
                <p>Preparing your feedback</p>
              </div>
            ) : (
              <p className="end-screen-body">{copy.body}</p>
            )}
            <div className="end-summary-card">
              <div className="end-summary-row"><span>Role</span><strong>{s.role}</strong></div>
              <div className="end-summary-row"><span>Type</span><strong>{s.interviewType || '—'}</strong></div>
              <div className="end-summary-row"><span>Difficulty</span><strong>{s.difficulty || '—'}</strong></div>
              <div className="end-summary-row">
                <span>Duration</span>
                <strong>
                  {formatClock(s.usedSec ?? 0)} / {formatClock(s.plannedSec ?? 0)}
                </strong>
              </div>
              <div className="end-summary-row">
                <span>Answers recorded</span>
                <strong>{s.questionsAnswered ?? 0}</strong>
              </div>
            </div>
            <div className="end-screen-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={isScoring}
                onClick={() => navigate(`/results?id=${encodeURIComponent(endScreen.resultId)}`)}
              >
                {isScoring ? 'Evaluating…' : 'View Results'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={isScoring}
                onClick={() => navigate('/dashboard')}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="app live-mode">
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <header className="live-topbar">
        <Link to="/dashboard" className="brand">
          <div className="brand-orb">IV</div>
          <span>Intervia</span>
        </Link>
        <div className="live-meta">
          <span className="live-role">{resolvedRole}</span>
          <span className="live-pill">
            {isText ? 'Text' : 'Voice'} · {config.interviewType} · {config.difficulty}
          </span>
          {started && (
            <span className={`live-timer ${remainingSec <= 60 ? 'urgent' : ''}`}>
              {formatClock(remainingSec)}
            </span>
          )}
        </div>
        <div className="live-top-actions">
          <span
            className={`status-dot ${
              (isText && started && !finishing) || (connected && !paused) ? 'connected' : ''
            }`}
          ></span>
          <span className="live-status-text">{statusLabel}</span>
          <Link to="/interview" className="btn-secondary btn-sm">
            ← Setup
          </Link>
        </div>
      </header>

      <div className="live-body">
        <section className="live-panel">
          {!started && messages.length === 0 && (
            <div className="live-ready">
              <p className="section-eyebrow">{isText ? 'Text interview' : 'Voice interview'}</p>
              <h1>Ready when you are</h1>
              <p>
                You will practice as a <strong>{resolvedRole}</strong> candidate.
                {isText
                  ? ' Type your answers in the box below after each question.'
                  : ' The AI will greet you, introduce the interview, and ask questions one at a time.'}
              </p>
              <ul className="live-config-list">
                <li><span>Mode</span> {isText ? 'Text' : 'Voice'}</li>
                <li><span>Type</span> {config.interviewType}</li>
                <li><span>Difficulty</span> {config.difficulty}</li>
                <li><span>Experience</span> {config.experienceLevel}</li>
                <li><span>Duration</span> {config.duration} minutes</li>
                {resumeText ? <li><span>Resume</span> Session-only tailoring on</li> : null}
              </ul>
              <button type="button" className="btn-primary btn-lg" onClick={handleStart}>
                Begin Interview
                <span className="btn-arrow">→</span>
              </button>
              {!isText && (
                <p style={{ marginTop: 16, fontSize: 12, color: 'var(--dim)' }}>
                  Requires microphone permission and the Intervia backend on port 3001.
                </p>
              )}
            </div>
          )}

          {(started || messages.length > 0) && (
            <>
              {!isText && phase === 'connecting' && !connected && !error && connectionStatus !== 'reconnecting' && (
                <div className="live-connecting">
                  Connecting to AI interviewer and requesting microphone access…
                </div>
              )}

              {showReconnectBanner && (
                <div className={`live-reconnect-banner status-${connectionStatus}`}>
                  {connectionStatus === 'lost' && <p>Connection lost. Preparing to reconnect…</p>}
                  {connectionStatus === 'reconnecting' && <p>Reconnecting… Your transcript is preserved.</p>}
                  {connectionStatus === 'restored' && <p>Connection restored. Continuing the same interview.</p>}
                  {connectionStatus === 'failed' && (
                    <div>
                      <p>Unable to reconnect. Transcript so far is preserved.</p>
                      <div className="live-extend-actions" style={{ marginTop: 8 }}>
                        <button type="button" className="btn-secondary btn-sm" onClick={retryReconnect}>
                          Try again
                        </button>
                        <button type="button" className="btn-primary btn-sm" onClick={() => finishInterview('connection_failed')}>
                          End &amp; view results
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {paused && (
                <div className="live-paused-banner">
                  Interview paused — timer is stopped. Resume when you are ready.
                </div>
              )}

              {showExtend && remainingSec === 0 && !finishing && (
                <div className="live-extend-bar">
                  <p>Scheduled interview time has ended. Continue or finish?</p>
                  <div className="live-extend-actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => handleExtend(5)}>
                      +5 minutes
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => handleExtend(10)}>
                      +10 minutes
                    </button>
                    <button type="button" className="btn-primary btn-sm" onClick={() => finishInterview('time_expired')}>
                      End Interview
                    </button>
                  </div>
                </div>
              )}

              {showExtend && remainingSec > 0 && remainingSec <= 30 && !finishing && (
                <div className="live-extend-bar soft">
                  <p>Time is almost up. Extend if you need more time.</p>
                  <div className="live-extend-actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => handleExtend(5)}>
                      +5 min
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => handleExtend(10)}>
                      +10 min
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setShowExtend(false)}>
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div className="live-chat">
                {messages.map((m) => (
                  <div key={m.id} className={`message-row ${m.sender}`}>
                    <div className="message-avatar">
                      {m.sender === 'ai' ? '✦' : 'YOU'}
                    </div>
                    <div className="message-content">
                      <div className="message-name">
                        {m.sender === 'ai' ? 'AI Interviewer' : 'You'}
                      </div>
                      <div className="message-bubble">{m.text}</div>
                    </div>
                  </div>
                ))}
                {((!isText && connected && !paused) || (isText && textAgent.busy)) && (
                  <div className="typing-row">
                    <div className="typing-avatar">✦</div>
                    <div className="typing-content">
                      <span>AI Interviewer</span>
                      <div className="typing-bubble"><i></i><i></i><i></i></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="live-footer">
                {isText ? (
                  <div className="text-input-row">
                    <input
                      type="text"
                      className="text-interview-input"
                      placeholder="Type your answer…"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleTextSend()
                        }
                      }}
                      disabled={finishing || textAgent.busy}
                    />
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={handleTextSend}
                      disabled={!textInput.trim() || finishing || textAgent.busy}
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <div className="listening-indicator">
                    <span className="sound-wave">
                      <i></i><i></i><i></i><i></i>
                    </span>
                    <div>
                      <strong>
                        {connectionStatus === 'reconnecting'
                          ? 'Reconnecting'
                          : connectionStatus === 'failed'
                            ? 'Disconnected'
                            : error
                              ? 'Connection issue'
                              : paused
                                ? 'Paused'
                                : connected
                                  ? 'Listening to you'
                                  : 'Session ended'}
                      </strong>
                      <small>
                        {paused
                          ? 'Microphone muted · timer paused'
                          : connected
                            ? 'Speak naturally — short pauses are OK'
                            : 'You can view results'}
                      </small>
                    </div>
                  </div>
                )}
                <div className="live-footer-actions">
                  {!isText && connected && !paused && (
                    <button type="button" className="btn-secondary btn-sm" onClick={handlePause}>
                      Pause
                    </button>
                  )}
                  {!isText && connected && paused && (
                    <button type="button" className="btn-primary btn-sm" onClick={handleResume}>
                      Resume
                    </button>
                  )}
                  {(connected || started || isText) && (
                    <button
                      type="button"
                      className="end-button"
                      onClick={handleEnd}
                      disabled={finishing}
                    >
                      <span>■</span> {finishing ? 'Saving…' : 'End Interview'}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {error && connectionStatus !== 'failed' && (
            <div className="error-box">
              <span>!</span>
              {error}
            </div>
          )}
        </section>

        <aside className="live-orb-side">
          <div className={`orb ${(isText && started && !finishing) || (connected && !paused) ? 'orb-active' : ''}`}>
            <div className="orb-core"></div>
            <div className="orb-highlight"></div>
          </div>
          <div className="orb-label">
            <span className="live-dot"></span>
            {isText
              ? started
                ? 'TEXT MODE'
                : 'AI READY'
              : paused
                ? 'PAUSED'
                : connected
                  ? 'LISTENING'
                  : phase === 'connecting' || connectionStatus === 'reconnecting'
                    ? 'CONNECTING'
                    : 'AI READY'}
          </div>
        </aside>
      </div>
    </main>
  )
}
