import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="legal-page notfound-page">
      <header className="legal-header">
        <Link to="/" className="brand">
          <div className="brand-orb">IV</div>
          <span>Intervia</span>
        </Link>
      </header>
      <div className="notfound-body">
        <p className="section-eyebrow">404</p>
        <h1>Page not found</h1>
        <p>The page you requested does not exist or may have moved.</p>
        <div className="placeholder-actions">
          <Link to="/dashboard" className="btn-primary">Back to Dashboard</Link>
          <Link to="/" className="btn-secondary">Home</Link>
        </div>
      </div>
    </div>
  )
}
