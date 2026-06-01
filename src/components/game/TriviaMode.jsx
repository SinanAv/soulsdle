import GuessInput from './GuessInput'
import useTriviaLogic from '../../hooks/useTriviaLogic'
import { Link } from 'react-router-dom'
import getStoragePublicUrl from '../../utils/getStoragePublicUrl'
import ModeSwitcher from '../common/modeSwitcher'

const CLUE_BUTTONS = [
  { key: 'first', label: 'Game Clue' },
  { key: 'second', label: 'Location Clue' }
]

const getCharacterImageUrl = (name) => {
  return getStoragePublicUrl('imagesofcharacters', name)
}

export default function TriviaMode() {
  const {
    guesses,
    addGuess,
    resetGuesses,
    targetTrivia,
    targetCharacter,
    allCharacters,
    loading,
    error,
    firstClueUnlocked,
    firstClueRevealed,
    firstClueQuote,
    toggleFirstClue,
    secondClueUnlocked,
    secondClueRevealed,
    secondClueQuote,
    toggleSecondClue
  } = useTriviaLogic()

  const questionText = targetTrivia?.Question || targetTrivia?.question || 'Loading trivia...'
  const displayGuesses = [...guesses].reverse()
  const clueConfig = {
    first: { unlocked: firstClueUnlocked, onClick: toggleFirstClue },
    second: { unlocked: secondClueUnlocked, onClick: toggleSecondClue }
  }

  return (
    <div className="trivia-mode quotes-mode">
      <div className="mode-header">
        <Link className="back-button" to="/">Back</Link>
        <h2>Trivia</h2>
      </div>
      <ModeSwitcher />

      {error && <p className="mode-status error">{error}</p>}

      <div className="quote-card trivia-card">
        <p className="quote-text trivia-question">{loading ? 'Loading trivia...' : questionText}</p>
        <GuessInput
          onGuessSubmit={addGuess}
          onReset={resetGuesses}
          hideWhenDisabled={false}
          isDisabled={loading || Boolean(error) || !targetCharacter}
          allCharacters={allCharacters}
          guesses={guesses}
        />
      </div>

      <div className="clue-panel">
        <div className="clue-button-row">
          {CLUE_BUTTONS.map(({ key, label }) => (
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
            <p className="clue-placeholder">{firstClueQuote || 'No game clue available.'}</p>
          )}
          {secondClueRevealed && (
            <p className="clue-placeholder">{secondClueQuote || 'No location clue available.'}</p>
          )}
        </div>
      </div>

      {displayGuesses.length > 0 && (
        <div className="quote-guess-list">
          {displayGuesses.map((guess, index) => {
            const character = guess?.character
            const characterName = character?.name
            const imageUrl = getCharacterImageUrl(characterName)
            const isCorrect = Boolean(
              targetCharacter && String(character?.id) === String(targetCharacter?.id)
            )

            return (
              <div
                key={`${characterName || 'guess'}-${index}`}
                className={`quote-guess ${isCorrect ? 'is-correct' : 'is-wrong'}`}
              >
                <div className="quote-guess-image">
                  {imageUrl && <img src={imageUrl} alt={characterName || 'Character'} loading="eager" />}
                </div>
                <div className="quote-guess-name">{characterName || 'Unknown'}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
