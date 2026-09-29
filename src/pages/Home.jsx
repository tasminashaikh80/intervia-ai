import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const scrollTo = (id) => {
    setMobileMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="app home-mode">
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>
      <div className="bg-glow bg-glow-3"></div>

      <header className="navbar sticky-nav">
        <div className="nav-inner">
          <Link to="/" className="brand">
            <div className="brand-orb">IV</div>
            <span>Intervia</span>
          </Link>

          <nav className={`nav-links ${mobileMenuOpen ? 'open' : ''}`}>
            <button type="button" onClick={() => scrollTo('how-it-works')}>How It Works</button>
            <button type="button" onClick={() => scrollTo('features')}>Features</button>
            <button type="button" onClick={() => scrollTo('about')}>About</button>
            <div className="nav-mobile-actions">
              <Link to="/login" className="btn-ghost" onClick={() => setMobileMenuOpen(false)}>Log In</Link>
              <Link to="/register" className="btn-primary" onClick={() => setMobileMenuOpen(false)}>Get Started</Link>
            </div>
          </nav>

          <div className="nav-actions">
            <Link to="/login" className="btn-ghost">Log In</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>

          <button
            className={`menu-toggle ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            type="button"
            aria-label="Toggle menu"
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-badge">
              <span className="badge-dot"></span>
              AI-Powered Voice Interviews
            </div>
            <h1>
              Practice interviews.
              <br />
              Build confidence.
              <br />
              <span className="gradient-text">Get hired.</span>
            </h1>
            <p className="hero-sub">
              Practice realistic voice interviews with an AI interviewer that
              listens, responds, and gives personalized feedback.
            </p>
            <div className="hero-ctas">
              <Link to="/register" className="btn-primary btn-lg">
                Start Practicing
                <span className="btn-arrow">→</span>
              </Link>
              <button type="button" className="btn-secondary btn-lg" onClick={() => scrollTo('how-it-works')}>
                See How It Works
              </button>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <strong>Voice-first</strong>
                <span>Speak naturally</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <strong>Real-time</strong>
                <span>Adaptive questions</span>
              </div>
              <div className="trust-divider"></div>
              <div className="trust-item">
                <strong>Feedback</strong>
                <span>Actionable insights</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="orb-stage">
              <div className="orb-aura"></div>
              <div className="orb-ring r1"></div>
              <div className="orb-ring r2"></div>
              <div className="orb-ring r3"></div>
              <div className="hero-orb">
                <div className="orb-inner"></div>
                <div className="orb-shine"></div>
                <div className="sound-bars"><i></i><i></i><i></i><i></i><i></i></div>
              </div>
              <div className="orb-status">
                <span className="pulse-dot"></span>
                AI Interviewer Ready
              </div>
            </div>
            <div className="float-chip chip-1">
              <span className="chip-icon">◉</span>
              Listening…
            </div>
            <div className="float-chip chip-2">
              <strong>Adaptive</strong>
              <span>Follow-ups</span>
            </div>
          </div>
        </div>
      </section>

      <section className="intro-section" id="about">
        <div className="section-inner narrow">
          <p className="section-eyebrow">Your personal AI interview coach</p>
          <h2>
            Practice anytime. Speak naturally.
            <br />
            Improve with every session.
          </h2>
          <p className="intro-text">
            Intervia simulates realistic job interviews using voice.
            Talk with an AI interviewer that listens carefully, asks relevant
            follow-ups, and gives you clear feedback so you walk into your next
            real interview prepared and confident.
          </p>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="section-inner">
          <div className="section-header">
            <p className="section-eyebrow">Features</p>
            <h2>Everything you need to practice better</h2>
          </div>
          <div className="features-grid">
            <article className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>
              <h3>Real Voice Interviews</h3>
              <p>Practice speaking naturally instead of typing answers. Build real conversational confidence.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3>AI-Powered Questions</h3>
              <p>Get realistic questions based on the role you are preparing for, with adaptive follow-ups.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3>Instant Feedback</h3>
              <p>Understand your strengths and areas that need improvement after every practice session.</p>
            </article>
            <article className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </div>
              <h3>Track Your Progress</h3>
              <p>Monitor your interview performance over time and see how your confidence grows.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="how-section" id="how-it-works">
        <div className="section-inner">
          <div className="section-header">
            <p className="section-eyebrow">How it works</p>
            <h2>Three steps to better interviews</h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step-num">01</div>
              <div className="step-content">
                <h3>Choose Your Role</h3>
                <p>Select the position you are preparing for so the AI can tailor questions.</p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-num">02</div>
              <div className="step-content">
                <h3>Start Talking</h3>
                <p>Have a realistic voice conversation with your AI interviewer.</p>
              </div>
            </div>
            <div className="step-connector"></div>
            <div className="step">
              <div className="step-num">03</div>
              <div className="step-content">
                <h3>Get Feedback</h3>
                <p>Receive your score, strengths, weaknesses, and personalized suggestions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="audience-section">
        <div className="section-inner">
          <div className="section-header">
            <p className="section-eyebrow">Who is it for</p>
            <h2>Built for every stage of your career</h2>
          </div>
          <div className="audience-grid">
            <article className="audience-card">
              <div className="audience-icon">🎓</div>
              <h3>Students</h3>
              <p>Prepare for your first professional interview with realistic practice before the real thing.</p>
            </article>
            <article className="audience-card">
              <div className="audience-icon">💼</div>
              <h3>Job Seekers</h3>
              <p>Practice before your next real interview and walk in feeling prepared and confident.</p>
            </article>
            <article className="audience-card">
              <div className="audience-icon">🔄</div>
              <h3>Career Switchers</h3>
              <p>Build confidence when entering a new field by rehearsing role-specific conversations.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="preview-section">
        <div className="section-inner">
          <div className="section-header">
            <p className="section-eyebrow">Product preview</p>
            <h2>A glimpse of the interview experience</h2>
          </div>
          <div className="preview-frame">
            <div className="preview-chrome">
              <div className="chrome-dots"><span></span><span></span><span></span></div>
              <div className="chrome-title">Intervia — Live Session</div>
            </div>
            <div className="preview-body">
              <div className="preview-sidebar">
                <div className="preview-orb"><div className="mini-orb"></div></div>
                <div className="preview-status"><span className="pulse-dot"></span>Listening</div>
                <p className="preview-role">Junior Web Developer</p>
              </div>
              <div className="preview-chat">
                <div className="preview-msg ai">
                  <div className="msg-label">AI Interviewer</div>
                  <div className="msg-bubble">
                    Tell me about a challenging project you worked on. What was your role and how did you handle obstacles?
                  </div>
                </div>
                <div className="preview-msg user">
                  <div className="msg-label">You</div>
                  <div className="msg-bubble">
                    In my last project I led the frontend rebuild. We had tight deadlines, so I prioritized core features and coordinated daily with design…
                  </div>
                </div>
                <div className="preview-listening">
                  <span className="wave"><i></i><i></i><i></i><i></i></span>
                  AI is listening…
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="section-inner narrow">
          <h2>Your next interview starts here.</h2>
          <p>
            Practice smarter, speak with confidence, and walk into your next
            interview prepared.
          </p>
          <Link to="/register" className="btn-primary btn-lg">
            Start Practicing Free
            <span className="btn-arrow">→</span>
          </Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <div className="brand-orb">IV</div>
              <span>Intervia</span>
            </Link>
            <p>
              AI-powered interview practice. Build confidence for your next role.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Product</h4>
              <button type="button" onClick={() => scrollTo('features')}>Features</button>
              <button type="button" onClick={() => scrollTo('how-it-works')}>How It Works</button>
              <button type="button" onClick={() => scrollTo('about')}>About</button>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <Link to="/login">Log In</Link>
              <Link to="/register">Register</Link>
            </div>
            <div className="footer-col">
              <h4>Legal &amp; Help</h4>
              <Link to="/terms">Terms &amp; Conditions</Link>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/faq">FAQ</Link>
              <Link to="/contact">Contact Us</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} Intervia. All rights reserved.</p>
          <div className="footer-bottom-links">
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
