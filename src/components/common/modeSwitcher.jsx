import { NavLink } from 'react-router-dom'

const MODES = [
  { to: '/boss', icon: `${process.env.PUBLIC_URL}/BossIcon.png`, label: 'Boss' },
  { to: '/character', icon: `${process.env.PUBLIC_URL}/NpcOfTheDayIcon.png`, label: 'NPC' },
  { to: '/quotes', icon: `${process.env.PUBLIC_URL}/QuoteOfTheDay.png`, label: 'Quotes' },
  { to: '/trivia', icon: `${process.env.PUBLIC_URL}/TriviaOfTheDay.png`, label: 'Trivia' },
  { to: '/locations', icon: `${process.env.PUBLIC_URL}/LocationOfTheDay.png`, label: 'Location' }
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
          <span className="mode-switcher-icon" aria-hidden="true">
            <img src={icon} alt="" loading="eager" />
          </span>
          <span className="mode-switcher-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
