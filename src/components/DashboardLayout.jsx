import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../utils/notifications'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/interview', label: 'New Interview' },
  { to: '/history', label: 'Interview History' },
  { to: '/progress', label: 'Progress' },
  { to: '/profile', label: 'Profile' },
]

function greetingForNow() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function formatNotifTime(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState(() => getNotifications())
  const [unread, setUnread] = useState(() => getUnreadCount())
  const notifRef = useRef(null)
  const navigate = useNavigate()
  const { user, ready, isAuthenticated, logout } = useAuth()

  const refreshNotifs = useCallback(() => {
    setNotifications(getNotifications())
    setUnread(getUnreadCount())
  }, [])

  useEffect(() => {
    if (ready && !isAuthenticated) {
      navigate('/login', { replace: true })
    }
  }, [ready, isAuthenticated, navigate])

  useEffect(() => {
    if (!notifOpen) return
    const onDoc = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [notifOpen])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const toggleNotif = () => {
    setNotifOpen((v) => !v)
    refreshNotifs()
  }

  const handleMarkAll = () => {
    markAllNotificationsRead()
    refreshNotifs()
  }

  const handleNotifClick = (id) => {
    markNotificationRead(id)
    refreshNotifs()
  }

  if (!ready || !user) {
    return (
      <div className="dash-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  const displayName = user.name?.split(' ')[0] || user.name || 'there'
  const initial = (user.name || 'U').charAt(0).toUpperCase()

  return (
    <div className="dash-shell">
      <div
        className={`dash-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="dash-sidebar-top">
          <Link to="/" className="brand" onClick={() => setSidebarOpen(false)}>
            <div className="brand-orb">IV</div>
            <span>Intervia</span>
          </Link>
          <p className="dash-sidebar-label">Dashboard</p>
        </div>

        <nav className="dash-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `dash-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="dash-sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) => `dash-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebarOpen(false)}
          >
            Settings
          </NavLink>
          <button type="button" className="dash-nav-item logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <button
            type="button"
            className="dash-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span></span><span></span><span></span>
          </button>
          <div className="dash-header-text">
            <h1>{greetingForNow()}, {displayName} 👋</h1>
            <p>Ready to practice your next interview?</p>
          </div>
          <div className="dash-header-right">
            <div className="notif-wrap" ref={notifRef}>
              <button
                type="button"
                className="dash-icon-btn"
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={toggleNotif}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
              </button>

              {notifOpen && (
                <div className="notif-panel">
                  <div className="notif-panel-head">
                    <strong>Notifications</strong>
                    {unread > 0 && (
                      <button type="button" className="link-accent" onClick={handleMarkAll}>
                        Mark all as read
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="notif-empty">No new notifications</p>
                  ) : (
                    <ul className="notif-list">
                      {notifications.map((n) => (
                        <li
                          key={n.id}
                          className={`notif-item ${n.read ? 'read' : 'unread'}`}
                          onClick={() => handleNotifClick(n.id)}
                        >
                          <div className="notif-item-top">
                            <strong>{n.title}</strong>
                            <span>{formatNotifTime(n.createdAt)}</span>
                          </div>
                          <p>{n.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <Link to="/profile" className="dash-user-chip">
              <div className="dash-avatar">{initial}</div>
              <span>{user.name}</span>
            </Link>
          </div>
        </header>

        <div className="dash-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
