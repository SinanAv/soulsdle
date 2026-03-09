import GuessInput from './GuessInput'
import { supabase } from '../../services/supabase'
import useQuoteLogic from '../../hooks/useQuoteLogic'
import { Link } from 'react-router-dom'

export default function QuotesMode() {
  const {
    guesses,
    addGuess,
    resetGuesses,
    targetQuote,
    targetCharacter,
    allCharacters,
    isSolved,
    firstHintUnlocked,
    firstHintRevealed,
    firstHintQuote,
    toggleFirstHint,
    secondHintUnlocked,
    secondHintRevealed,
    secondHintQuote,
    toggleSecondHint
  } = useQuoteLogic()

  const getCharacterImageUrl = (name) => {
    if (!name) return ''
    const fileName = `${name}.jpg`
    return supabase.storage.from('imagesofcharacters').getPublicUrl(fileName).data.publicUrl
  }

  const quoteText = targetQuote?.quote || 'Loading quote...'
  const displayGuesses = [...guesses].reverse()

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
          <button
            type="button"
            className="hint-button"
            onClick={toggleFirstHint}
            disabled={!firstHintUnlocked}
          >
            Quote Hint 
          </button>
          <button
            type="button"
            className="hint-button"
            onClick={toggleSecondHint}
            disabled={!secondHintUnlocked}
          >
            Quote Hint 2
          </button>
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
            const characterName = guess?.character?.name
            const imageUrl = getCharacterImageUrl(characterName)
            const isCorrect = Boolean(
              targetCharacter && String(guess?.character?.id) === String(targetCharacter?.id)
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
            )}
          )}
        </div>
      )}
    </div>
  )
}
