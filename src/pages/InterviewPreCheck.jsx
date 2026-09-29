import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInterview } from '../context/InterviewContext'

function CheckRow({ ok, label, detail }) {
  return (
    <div className={`precheck-row ${ok === null ? '' : ok ? 'ok' : 'bad'}`}>
      <span className="precheck-icon">{ok === null ? '…' : ok ? '✓' : '✕'}</span>
      <div>
        <strong>{label}</strong>
        {detail && <p>{detail}</p>}
      </div>
    </div>
  )
}

export default function InterviewPreCheck() {
  const navigate = useNavigate()
  const { config, setConfig, resolvedRole } = useInterview()
  const [checks, setChecks] = useState({
    mediaDevices: null,
    getUserMedia: null,
    audioContext: null,
    audioWorklet: null,
    webSocket: null,
  })
  const [micState, setMicState] = useState('idle') // idle|requesting|active|error|stopped
  const [micError, setMicError] = useState('')
  const [volume, setVolume] = useState(0)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)

  useEffect(() => {
    const mediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    const getUserMedia = mediaDevices
    let audioContext = false
    let audioWorklet = false
    try {
      const AC = window.AudioContext || window.webkitAudioContext
      if (AC) {
        audioContext = true
        const tmp = new AC()
        audioWorklet = !!(tmp.audioWorklet && typeof tmp.audioWorklet.addModule === 'function')
        tmp.close().catch(() => {})
      }
    } catch {
      audioContext = false
    }
    const webSocket = typeof WebSocket !== 'undefined'
    setChecks({ mediaDevices, getUserMedia, audioContext, audioWorklet, webSocket })
  }, [])

  const stopMicTest = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {})
      audioCtxRef.current = null
    }
    analyserRef.current = null
    setVolume(0)
    setMicState((s) => (s === 'active' ? 'stopped' : s === 'requesting' ? 'idle' : s))
  }, [])

  useEffect(() => {
    return () => {
      stopMicTest()
    }
  }, [stopMicTest])

  const startMicTest = async () => {
    setMicError('')
    setMicState('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream
      const AC = window.AudioContext || window.webkitAudioContext
      const ctx = new AC()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      setMicState('active')

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        setVolume(Math.min(100, Math.round(rms * 280)))
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.error('[PreCheck] mic error', err)
      setMicState('error')
      setMicError(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow access in your browser settings to use voice interviews.'
          : 'Could not access the microphone. Check that a mic is connected and not used by another app.'
      )
    }
  }

  const browserOk =
    checks.mediaDevices &&
    checks.getUserMedia &&
    checks.audioContext &&
    checks.webSocket

  const micOk = micState === 'active' || micState === 'stopped'
  // For text mode, mic is optional
  const isText = config.mode === 'text'
  const canContinue = browserOk && (isText || micOk || checks.getUserMedia)

  const handleContinue = () => {
    stopMicTest()
    navigate('/interview/live')
  }

  return (
    <div className="setup-page precheck-page">
      <Link to="/interview" className="setup-back">
        ← Back to Setup
      </Link>

      <header className="setup-header">
        <p className="section-eyebrow">Pre-interview check</p>
        <h1>Ready your browser</h1>
        <p className="setup-lead">
          Confirm that your browser and microphone work before the {resolvedRole} interview starts.
        </p>
      </header>

      <div className="setup-layout">
        <div className="setup-main">
          <section className="setup-section">
            <h2 className="setup-section-title">Interview mode</h2>
            <div className="setup-chip-grid setup-chip-2">
              <button
                type="button"
                className={`setup-chip-card ${config.mode !== 'text' ? 'selected' : ''}`}
                onClick={() => setConfig({ mode: 'voice' })}
              >
                <strong>Voice Interview</strong>
                <span>Speak with the AI interviewer using your microphone (default).</span>
              </button>
              <button
                type="button"
                className={`setup-chip-card ${config.mode === 'text' ? 'selected' : ''}`}
                onClick={() => setConfig({ mode: 'text' })}
              >
                <strong>Text Interview</strong>
                <span>Type answers instead of speaking. Useful for demos and accessibility.</span>
              </button>
            </div>
          </section>

          <section className="setup-section">
            <h2 className="setup-section-title">Browser compatibility</h2>
            <div className="precheck-list">
              <CheckRow
                ok={checks.mediaDevices}
                label="Media devices API"
                detail={
                  checks.mediaDevices
                    ? 'Supported'
                    : 'Your browser cannot access media devices. Try Chrome, Edge, or Firefox.'
                }
              />
              <CheckRow
                ok={checks.getUserMedia}
                label="Microphone access API"
                detail={
                  checks.getUserMedia
                    ? 'Supported'
                    : 'getUserMedia is not available. Voice interviews need a modern browser.'
                }
              />
              <CheckRow
                ok={checks.audioContext}
                label="Web Audio"
                detail={
                  checks.audioContext
                    ? 'Supported'
                    : 'Web Audio API is missing. Audio playback may not work.'
                }
              />
              <CheckRow
                ok={checks.audioWorklet}
                label="Audio worklet"
                detail={
                  checks.audioWorklet
                    ? 'Supported'
                    : 'AudioWorklet not available — voice processing may be limited.'
                }
              />
              <CheckRow
                ok={checks.webSocket}
                label="WebSocket"
                detail={
                  checks.webSocket
                    ? 'Supported'
                    : 'WebSockets are required to talk to the AI interviewer.'
                }
              />
            </div>
          </section>

          {!isText && (
            <section className="setup-section">
              <h2 className="setup-section-title">Microphone test</h2>
              <p className="setup-lead" style={{ marginBottom: 16 }}>
                Click Test Microphone, allow permission, then speak. You should see the level bar move.
              </p>
              <div className="precheck-mic-panel">
                <div className="precheck-volume-track">
                  <div
                    className="precheck-volume-fill"
                    style={{ width: `${volume}%` }}
                  />
                </div>
                <p className="precheck-mic-status">
                  {micState === 'idle' && 'Not tested yet'}
                  {micState === 'requesting' && 'Requesting permission…'}
                  {micState === 'active' && (volume > 8 ? 'Microphone detected — keep speaking' : 'Listening… say something')}
                  {micState === 'stopped' && 'Test stopped — microphone released'}
                  {micState === 'error' && 'Microphone test failed'}
                </p>
                {micError && <p className="setup-error">{micError}</p>}
                <div className="precheck-mic-actions">
                  {micState !== 'active' && (
                    <button type="button" className="btn-primary btn-sm" onClick={startMicTest}>
                      Test Microphone
                    </button>
                  )}
                  {micState === 'active' && (
                    <button type="button" className="btn-secondary btn-sm" onClick={stopMicTest}>
                      Stop Test
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {isText && (
            <section className="setup-section">
              <div className="precheck-row ok">
                <span className="precheck-icon">✓</span>
                <div>
                  <strong>Text mode selected</strong>
                  <p>Microphone is not required. You will type answers during the interview.</p>
                </div>
              </div>
            </section>
          )}
        </div>

        <aside className="setup-summary-wrap">
          <div className="setup-summary">
            <h2>Checklist</h2>
            <dl className="setup-summary-list">
              <div>
                <dt>Role</dt>
                <dd>{resolvedRole}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{isText ? 'Text' : 'Voice'}</dd>
              </div>
              <div>
                <dt>Browser</dt>
                <dd>{browserOk ? 'Ready' : 'Issues found'}</dd>
              </div>
              <div>
                <dt>Microphone</dt>
                <dd>{isText ? 'Not required' : micOk ? 'Tested' : 'Test recommended'}</dd>
              </div>
            </dl>

            <button
              type="button"
              className="btn-primary btn-auth setup-start-btn"
              onClick={handleContinue}
              disabled={!canContinue}
            >
              Continue to Interview
              <span className="btn-arrow">→</span>
            </button>
            <Link to="/interview" className="btn-secondary" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>
              Back to Setup
            </Link>
            {!canContinue && (
              <p className="setup-error" style={{ marginTop: 12 }}>
                {browserOk
                  ? 'Test your microphone (or switch to Text mode) to continue.'
                  : 'Fix browser compatibility issues, or try another browser.'}
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
