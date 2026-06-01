import { NavLink } from 'react-router-dom'

const MODES = [
  { to: '/boss', icon: 'B', label: 'Boss' },
  { to: '/character', icon: 'N', label: 'NPC' },
  { to: '/quotes', icon: 'Q', label: 'Quotes' },
  { to: '/trivia', icon: 'T', label: 'Trivia' },
  { to: '/locations', icon: 'L', label: 'Location' }
]

export default function ModeSwitcher() {
  return (
    <nav className="mode-switcher" aria-label="Game modes">
      {MODES.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `mode-switcher-link${isActive ? ' is-active' : ''}`}
        >
          <span className="mode-switcher-icon" aria-hidden="true">{icon}</span>
          <span className="mode-switcher-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
