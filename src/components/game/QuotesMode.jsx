import GuessInput from './GuessInput'
import useQuoteLogic from '../../hooks/useQuoteLogic'
import { Link } from 'react-router-dom'
import getStoragePublicUrl from '../../utils/getStoragePublicUrl'

const CLUE_BUTTONS = [
  { key: 'first', label: 'Game Clue' },
  { key: 'second', label: 'Location Clue' }
]

const getCharacterImageUrl = (name) => {
  return getStoragePublicUrl('imagesofcharacters', name)
}

export default function QuotesMode() {
  const {
    guesses,
    addGuess,
    resetGuesses,
    targetQuote,
    targetCharacter,
    allCharacters,
    firstClueUnlocked,
    firstClueRevealed,
    firstClueQuote,
    toggleFirstClue,
    secondClueUnlocked,
    secondClueRevealed,
    secondClueQuote,
    toggleSecondClue
  } = useQuoteLogic()

  const quoteText = targetQuote?.quote || 'Loading quote...'
  const displayGuesses = [...guesses].reverse()
  const clueConfig = {
    first: { unlocked: firstClueUnlocked, onClick: toggleFirstClue },
    second: { unlocked: secondClueUnlocked, onClick: toggleSecondClue }
  }

  return (
    <div className="quotes-mode">
      <div className="mode-header">
        <Link className="back-button" to="/">Back</Link>
        <h2>Quotes</h2>
      </div>

      <div className="quote-card">
        <p className="quote-text">{quoteText}</p>
        <GuessInput
          onGuessSubmit={addGuess}
          onReset={resetGuesses}
          hideWhenDisabled={false}
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
