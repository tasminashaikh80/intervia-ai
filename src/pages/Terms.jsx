import { Link, useNavigate } from 'react-router-dom'

export default function Terms() {
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
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: September 2026</p>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Intervia, you agree to these Terms of Service. If you do not agree, do not use the application.</p>
        <h2>2. Use of Intervia</h2>
        <p>Intervia provides AI-assisted interview practice for educational and personal development purposes. You may use the service only for lawful purposes and in accordance with these terms.</p>
        <h2>3. AI Interview Disclaimer</h2>
        <p>Interview questions, feedback, and scores are generated or assisted by artificial intelligence and heuristic analysis. They are informational only and must not be treated as guaranteed hiring decisions, professional career advice, or certified assessments. Human judgment should always take precedence in real hiring processes.</p>
        <h2>4. User Responsibilities</h2>
        <p>You are responsible for the accuracy of information you provide, for securing access to your device, and for using a supported browser with a working microphone when choosing voice mode.</p>
        <h2>5. Interview Results</h2>
        <p>Results are based on the transcript and evidence collected during your session. Intervia does not guarantee that scores reflect how you would perform in a real interview with a human interviewer.</p>
        <h2>6. Intellectual Property</h2>
        <p>Intervia branding, interface, and original content remain the property of their respective owners. You retain rights to your own answers and uploaded resume text used only for the active session.</p>
        <h2>7. Service Availability</h2>
        <p>The service is provided as-is. Features that depend on third-party AI or speech services may be unavailable when those services or the local development backend are offline.</p>
        <h2>8. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, Intervia and its contributors are not liable for indirect, incidental, or consequential damages arising from use of the practice interviews, scores, or reports.</p>
        <h2>9. Changes to Terms</h2>
        <p>These terms may be updated from time to time. Continued use after changes constitutes acceptance of the revised terms.</p>
        <h2>10. Contact</h2>
        <p>For questions about these terms, use the contact options provided on the Intervia site or project documentation.</p>
        <p style={{ marginTop: 32 }}>
          <Link to="/privacy" className="link-accent">Privacy Policy</Link>
          {' · '}
          <Link to="/faq" className="link-accent">FAQ</Link>
        </p>
      </article>
    </div>
  )
}
