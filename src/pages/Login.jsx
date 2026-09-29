import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')

  const validate = () => {
    const next = {}
    if (!email.trim()) next.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email'
    if (!password) next.password = 'Password is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError('')
    if (!validate()) return
    const result = login({ email, password })
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    navigate('/dashboard')
  }

  return (
    <main className="app auth-mode">
      <div className="bg-glow bg-glow-1"></div>
      <div className="bg-glow bg-glow-2"></div>

      <div className="auth-wrap">
        <Link to="/" className="auth-back">← Back to Home</Link>

        <div className="auth-card">
          <Link to="/" className="brand auth-brand">
            <div className="brand-orb">IV</div>
            <span>Intervia</span>
          </Link>

          <h1 className="auth-title">Welcome back 👋</h1>
          <p className="auth-sub">Continue your interview preparation</p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
                }}
                className={errors.email ? 'invalid' : ''}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="login-password">Password</label>
                <button type="button" className="link-muted">Forgot password?</button>
              </div>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((p) => ({ ...p, password: undefined }))
                }}
                className={errors.password ? 'invalid' : ''}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            {formError && <span className="field-error">{formError}</span>}

            <button type="submit" className="btn-primary btn-auth">Log In</button>
          </form>

          <div className="auth-divider"><span>OR</span></div>

          <button type="button" className="btn-google">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
              <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.348 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>

          <p className="auth-switch">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="link-accent">Create account</Link>
          </p>
        </div>

        <p className="auth-tagline">Practice. Perform. Improve.</p>
      </div>
    </main>
  )
}
