import GuessInput from './GuessInput'
import { supabase } from '../../services/supabase'
import useQuoteLogic from '../../hooks/useQuoteLogic'
import { Link } from 'react-router-dom'

const HINT_BUTTONS = [
  { key: 'first', label: 'Quote Hint' },
  { key: 'second', label: 'Quote Hint 2' }
]

const getCharacterImageUrl = (name) => {
  if (!name) return ''
  return supabase.storage.from('imagesofcharacters').getPublicUrl(`${name}.jpg`).data.publicUrl
}

export default function QuotesMode() {
  const {
    guesses,
    addGuess,
    resetGuesses,
    targetQuote,
    targetCharacter,
    allCharacters,
    firstHintUnlocked,
    firstHintRevealed,
    firstHintQuote,
    toggleFirstHint,
    secondHintUnlocked,
    secondHintRevealed,
    secondHintQuote,
    toggleSecondHint
  } = useQuoteLogic()

  const quoteText = targetQuote?.quote || 'Loading quote...'
  const displayGuesses = [...guesses].reverse()
  const hintConfig = {
    first: { unlocked: firstHintUnlocked, onClick: toggleFirstHint },
    second: { unlocked: secondHintUnlocked, onClick: toggleSecondHint }
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

      <div className="hint-panel">
        <div className="hint-button-row">
          {HINT_BUTTONS.map(({ key, label }) => (
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
            <p className="hint-placeholder">{firstHintQuote || 'No extra quote available.'}</p>
          )}
          {secondHintRevealed && (
            <p className="hint-placeholder">{secondHintQuote || 'No third quote available.'}</p>
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
