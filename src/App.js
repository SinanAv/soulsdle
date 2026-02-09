import './styles/base.css'
import './styles/home.css'
import './styles/game.css'
import './styles/quotes.css'
import GuessInput from './components/game/GuessInput'
import useGameLogic from './hooks/useGameLogic'
import GameGrid from './components/game/GameGrid'
import QuotesMode from './components/game/QuotesMode'
import { Link, Route, Routes } from 'react-router-dom'

function Home() {
  return (
    <div className="mode-select">
      <Link className="mode-button" to="/character">Character of the Day</Link>
      <Link className="mode-button" to="/quotes">Quotes</Link>
    </div>
  )
}

function CharacterMode() {
  const { guesses, addGuess, resetGuesses, targetCharacter, allCharacters } = useGameLogic()
  console.log('character of the day:', targetCharacter)

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
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}

export default App
