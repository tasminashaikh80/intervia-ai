import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CONTACT_EMAIL } from '../utils/interviewIntroduction'

export default function Contact() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const validate = () => {
    const next = {}
    if (!name.trim()) next.name = 'Please enter your name.'
    if (!email.trim()) next.email = 'Please enter your email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = 'Please enter a valid email address.'
    }
    if (!subject.trim()) next.subject = 'Please enter a subject.'
    if (!message.trim()) next.message = 'Please enter a message.'
    else if (message.trim().length < 10) next.message = 'Message is a bit short — add a few more details.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return

    // Frontend-only: open the user's email client (honest, no fake "sent" claim)
    const body = [
      message.trim(),
      '',
      '—',
      `From: ${name.trim()} <${email.trim()}>`,
    ].join('\n')
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    setSubmitted(true)
  }

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="brand">
          <div className="brand-orb">IV</div>
          <span>Intervia</span>
        </Link>
        <button type="button" className="btn-secondary btn-sm" onClick={() => navigate(-1)}>
          Home
        </button>
      </header>

      <article className="legal-body contact-page">
        <p className="section-eyebrow">Contact</p>
        <h1>Get in Touch</h1>
        <p className="setup-lead">
          Have a question, found an issue, or want to share feedback? We&apos;d love to hear from you.
        </p>

        {submitted ? (
          <div className="contact-thanks">
            <h2>Open your email app to send</h2>
            <p>
              Contact form submission is currently available through email. If your email client did not open,
              send a message to{' '}
              <a className="link-accent" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              .
            </p>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setSubmitted(false)}>
              Back to form
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-field">
              <label htmlFor="contact-name">Name</label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              {errors.name && <p className="contact-error">{errors.name}</p>}
            </div>
            <div className="contact-field">
              <label htmlFor="contact-email">Email</label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {errors.email && <p className="contact-error">{errors.email}</p>}
            </div>
            <div className="contact-field">
              <label htmlFor="contact-subject">Subject</label>
              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              {errors.subject && <p className="contact-error">{errors.subject}</p>}
            </div>
            <div className="contact-field">
              <label htmlFor="contact-message">Message</label>
              <textarea
                id="contact-message"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              {errors.message && <p className="contact-error">{errors.message}</p>}
            </div>
            <button type="submit" className="btn-primary">
              Send Message
            </button>
            <p className="contact-note">
              Submissions open your email client and send to{' '}
              <a className="link-accent" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
              . No message is stored on Intervia servers.
            </p>
          </form>
        )}

        <p style={{ marginTop: 32 }}>
          <Link to="/faq" className="link-accent">
            FAQ
          </Link>
          {' · '}
          <Link to="/privacy" className="link-accent">
            Privacy Policy
          </Link>
          {' · '}
          <Link to="/terms" className="link-accent">
            Terms &amp; Conditions
          </Link>
        </p>
      </article>
    </div>
  )
}
