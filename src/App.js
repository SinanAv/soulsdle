import './App.css'
import GuessInput from './components/game/GuessInput'
import useGameLogic from './hooks/useGameLogic'
import GameGrid from './components/game/GameGrid'

function App() {
  const { guesses, addGuess, resetGuesses, targetCharacter, allCharacters } = useGameLogic()
  console.log('Target Character:', targetCharacter)

  return (
    <div className="App">
      <h1>Character Test</h1>

      {/* GuessInput only calls addGuess when user submits */}
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

export default App
