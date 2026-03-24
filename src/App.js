import './styles/base.css'
import './styles/home.css'
import './styles/game.css'
import './styles/quotes.css'
import { Link, Route, Routes } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import GuessInput from './components/game/GuessInput'
import GameGrid from './components/game/GameGrid'
import QuotesMode from './components/game/QuotesMode'
import LocationMode from './components/game/LocationMode'
import useGameLogic from './hooks/useGameLogic'

const HOME_MODES = [
  { to: '/character', label: 'Character of the Day' },
  { to: '/quotes', label: 'Quotes' },
  { to: '/locations', label: 'Location Splash' }
]

const CHARACTER_HINT_BUTTONS = [
  { key: 'quote', label: 'Quote Clue' },
  { key: 'location', label: 'Location Hint' }
]

function Home() {
  return (
    <div className="mode-select">
      {HOME_MODES.map(({ to, label }) => (
        <Link key={to} className="mode-button" to={to}>{label}</Link>
      ))}
    </div>
  )
}

function CharacterMode() {
  const {
    guesses,
    addGuess,
    resetGuesses,
    targetCharacter,
    dailyPickDay,
    allCharacters,
    error,
    firstHintQuote,
    firstHintUnlocked,
    firstHintRevealed,
    toggleFirstHint,
    locationHintUnlocked,
    locationHintRevealed,
    toggleLocationHint,
    locationHintValue
  } = useGameLogic()

  const lastLogRef = useRef('')
  useEffect(() => {
    if (!dailyPickDay && !error) return
    const key = `${dailyPickDay}|${targetCharacter?.id || ''}|${error || ''}`
    if (key === lastLogRef.current) return
    lastLogRef.current = key
    console.log('character of the day:', dailyPickDay, targetCharacter, error)
  }, [dailyPickDay, error, targetCharacter])

  const hintConfig = {
    quote: { unlocked: firstHintUnlocked, onClick: toggleFirstHint },
    location: { unlocked: locationHintUnlocked, onClick: toggleLocationHint }
  }

  return (
    <div className="character-mode">
      <div className="mode-header">
        <Link className="back-button" to="/">Back</Link>
        <h2>Character of the Day</h2>
      </div>

      <GuessInput
        onGuessSubmit={addGuess}
        onReset={resetGuesses}
        allCharacters={allCharacters}
        guesses={guesses}
      />

      <div className="hint-panel">
        <div className="hint-button-row">
          {CHARACTER_HINT_BUTTONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="hint-button"
              onClick={hintConfig[key].onClick}
              disabled={!hintConfig[key].unlocked}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="hint-results">
          {firstHintRevealed && (
            <p className="hint-placeholder">{firstHintQuote || 'No quote hint available.'}</p>
          )}
          {locationHintRevealed && (
            <p className="hint-placeholder">{locationHintValue || 'No location hint available.'}</p>
          )}
        </div>
      </div>

      <GameGrid guesses={guesses} targetCharacter={targetCharacter} />
    </div>
  )
}

function App() {
  return (
    <div className="App">
      <h1>Soulsdle</h1>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/character" element={<CharacterMode />} />
        <Route path="/quotes" element={<QuotesMode />} />
        <Route path="/locations" element={<LocationMode />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}

export default App
