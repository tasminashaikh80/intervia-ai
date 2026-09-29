import { Link, useNavigate } from 'react-router-dom'

const ITEMS = [
  { q: 'What is Intervia?', a: 'Intervia is an AI-assisted interview practice app. You choose a role, type, and difficulty, then practice with a voice or text interviewer and review evidence-based feedback.' },
  { q: 'How does the AI interview work?', a: 'In voice mode, Intervia connects to a speech-to-speech agent, sends a system prompt with your role and curated questions, and streams microphone audio. In text mode, you type answers and receive text replies using the same interview structure.' },
  { q: 'Do I need a microphone?', a: 'Yes for Voice Interview. Text Interview mode does not require a microphone and is useful for demos, accessibility, or when audio is unavailable.' },
  { q: 'What browsers are supported?', a: 'Modern Chromium browsers (Chrome, Edge) and recent Firefox are recommended. You need MediaDevices, Web Audio, and WebSocket support. Use the Pre-Interview Check page to verify.' },
  { q: 'Can I pause an interview?', a: 'Yes. In a live voice session you can Pause and Resume. The timer stops while paused.' },
  { q: 'What happens if my connection drops?', a: 'Intervia attempts automatic reconnection for unexpected disconnects, preserves your transcript, and continues the same interview when possible. If reconnection fails, your transcript is kept so you can still finish and view results.' },
  { q: 'Can I upload my resume?', a: 'Yes, optionally as a PDF on Interview Setup. Text is extracted in the browser only for the current session and is not permanently stored by the app.' },
  { q: 'How are interview scores generated?', a: 'Scores come from an evidence-based analysis of your transcript. Weak or missing answers produce low scores or Insufficient evidence. The app does not invent positive feedback.' },
  { q: 'Can I download my report?', a: 'Yes. On the Results page, use Download PDF Report to generate a client-side PDF from the same data shown on screen.' },
  { q: 'What happens when interview time ends?', a: 'You are offered a short extension or can end the interview. Ending saves results based on the conversation so far.' },
  { q: 'Can I use text fallback mode?', a: 'Yes. On the Pre-Interview Check page, choose Text Interview. Setup, timer, transcript, results, and PDF all still apply.' },
]

export default function FAQ() {
  const navigate = useNavigate()

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="brand">
          <div className="brand-orb">IV</div>
          <span>Intervia</span>
        </Link>
        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(-1)}>
          Dashboard
        </button>
      </header>
      <article className="legal-body">
        <p className="section-eyebrow">Help</p>
        <h1>FAQ</h1>
        <p className="setup-lead">Common questions about practicing with Intervia.</p>
        <div className="faq-list">
          {ITEMS.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <p style={{ marginTop: 32 }}>
          <Link to="/terms" className="link-accent">Terms</Link>
          {' · '}
          <Link to="/privacy" className="link-accent">Privacy</Link>
        </p>
      </article>
    </div>
  )
}
