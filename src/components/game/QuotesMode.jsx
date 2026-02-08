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
    isSolved
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
