import { Link, useNavigate } from 'react-router-dom'

export default function Privacy() {
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
        <p className="section-eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: September 2026</p>
        <h2>Overview</h2>
        <p>Intervia is primarily a client-side application. This policy describes how data is handled in the current implementation. We do not invent server infrastructure that does not exist.</p>
        <h2>Account information</h2>
        <p>If you register or sign in within the app, account details are stored in browser storage (for example localStorage) for the demo/auth flow. There is no separate production account database in this frontend build.</p>
        <h2>Interview data and transcripts</h2>
        <p>Completed interview results—including scores, feedback summaries, and transcripts—are saved in your browser localStorage so you can view History and Results on the same device. Clearing site data removes them.</p>
        <h2>Uploaded resumes</h2>
        <p>Resume PDFs are processed entirely in the browser. Extracted text is kept in memory for the current interview session to tailor questions. Resumes are not uploaded to an Intervia server and are not written to permanent storage by the app. Text is discarded when the session ends or the page state is cleared.</p>
        <h2>Voice and audio processing</h2>
        <p>In voice mode, microphone audio is streamed to the configured speech-to-speech provider (AssemblyAI Voice Agent) via a short-lived token obtained from the local Intervia development backend. Audio is required for the live conversation and is not stored by the Intervia frontend as interview recordings.</p>
        <h2>AI processing</h2>
        <p>Prompts, system instructions, and conversation context are sent to the external AI voice service required to run the interview. Heuristic scoring on the Results page runs locally in the browser from the transcript.</p>
        <h2>localStorage</h2>
        <p>The app uses localStorage for interview configuration preferences, completed interview history, notifications, and settings. Sensitive resume full text is intentionally not persisted there.</p>
        <h2>Third-party services</h2>
        <p>Voice interviews depend on AssemblyAI (or the configured voice agent endpoint). Their processing is subject to their own policies. PDF generation for reports runs entirely in your browser.</p>
        <h2>Your choices</h2>
        <p>You can clear browser storage to remove local history, decline microphone permission, use text interview mode, or continue without uploading a resume.</p>
        <p style={{ marginTop: 32 }}>
          <Link to="/terms" className="link-accent">Terms of Service</Link>
          {' · '}
          <Link to="/faq" className="link-accent">FAQ</Link>
        </p>
      </article>
    </div>
  )
}
