import './styles/base.css'
import './styles/home.css'
import './styles/game.css'
import './styles/quotes.css'
import { Link, Route, Routes } from 'react-router-dom'
import GuessInput from './components/game/GuessInput'
import GameGrid from './components/game/GameGrid'
import QuotesMode from './components/game/QuotesMode'
import LocationMode from './components/game/LocationMode'
import useGameLogic from './hooks/useGameLogic'
import useBossLogic from './hooks/useBossLogic'

const HOME_MODES = [
  { to: '/boss', label: 'Boss Of The Day' },
  { to: '/character', label: 'NPC Of The Day' },
  { to: '/quotes', label: 'Quotes' },
  { to: '/locations', label: 'Location Splash' }
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
    allCharacters,
    loading,
    error,
    isSolved,
    firstClueQuote,
    firstClueUnlocked,
    firstClueRevealed,
    toggleFirstClue,
    locationClueUnlocked,
    locationClueRevealed,
    toggleLocationClue,
    locationClueValue
  } = useGameLogic()

  const clueButtons = [
    { key: 'quote', label: 'Quote Clue' },
    { key: 'location', label: 'Location Clue' }
  ]

  const clueConfig = {
    quote: { unlocked: firstClueUnlocked, onClick: toggleFirstClue },
    location: { unlocked: locationClueUnlocked, onClick: toggleLocationClue }
  }

  return (
    <div className="character-mode">
      <div className="mode-header">
        <Link className="back-button" to="/">Back</Link>
        <h2>NPC Of The Day</h2>
      </div>

      {loading && <p className="mode-status">Loading character of the day…</p>}
      {error && <p className="mode-status error">{error}</p>}

      <GuessInput
        onGuessSubmit={addGuess}
        onReset={resetGuesses}
        isDisabled={loading || Boolean(error) || !targetCharacter || isSolved}
        allCharacters={allCharacters}
        guesses={guesses}
      />

        <div className="clue-panel">
          <div className="clue-button-row">
          {clueButtons.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="clue-button"
              onClick={clueConfig[key].onClick}
              disabled={!clueConfig[key].unlocked}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="clue-results">
          {firstClueRevealed && (
            <p className="clue-placeholder">{firstClueQuote || 'No quote clue available.'}</p>
          )}
          {locationClueRevealed && (
            <p className="clue-placeholder">{locationClueValue || 'No location clue available.'}</p>
          )}
        </div>
      </div>

      <GameGrid guesses={guesses} targetCharacter={targetCharacter} />
    </div>
  )
}

function BossMode() {
  const {
    guesses,
    addGuess,
    resetGuesses,
    targetCharacter,
    allCharacters,
    loading,
    error,
    isSolved,
    firstClueQuote,
    firstClueUnlocked,
    firstClueRevealed,
    toggleFirstClue,
    locationClueUnlocked,
    locationClueRevealed,
    toggleLocationClue,
    locationClueValue
  } = useBossLogic()

  const clueButtons = [
    { key: 'quote', label: 'Game Clue' },
    { key: 'location', label: 'Location Clue' }
  ]

  const clueConfig = {
    quote: { unlocked: firstClueUnlocked, onClick: toggleFirstClue },
    location: { unlocked: locationClueUnlocked, onClick: toggleLocationClue }
  }

  return (
    <div className="character-mode boss-mode">
      <div className="mode-header">
        <Link className="back-button" to="/">Back</Link>
        <h2>Boss of the Day</h2>
      </div>

      {loading && <p className="mode-status">Loading boss of the day…</p>}
      {error && <p className="mode-status error">{error}</p>}

      <GuessInput
        onGuessSubmit={addGuess}
        onReset={resetGuesses}
        isDisabled={loading || Boolean(error) || !targetCharacter || isSolved}
        allCharacters={allCharacters}
        guesses={guesses}
      />

        <div className="clue-panel">
          <div className="clue-button-row">
          {clueButtons.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className="clue-button"
              onClick={clueConfig[key].onClick}
              disabled={!clueConfig[key].unlocked}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="clue-results">
          {firstClueRevealed && (
            <p className="clue-placeholder">{firstClueQuote || 'No quote clue available.'}</p>
          )}
          {locationClueRevealed && (
            <p className="clue-placeholder">{locationClueValue || 'No location clue available.'}</p>
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
        <Route path="/boss" element={<BossMode />} />
        <Route path="/quotes" element={<QuotesMode />} />
        <Route path="/locations" element={<LocationMode />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}

export default App
