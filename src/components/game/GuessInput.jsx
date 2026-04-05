import { useEffect, useMemo, useState } from 'react'
import getStoragePublicUrl from '../../utils/getStoragePublicUrl'

const getCharacterImageUrl = (name) => {
  return getStoragePublicUrl('imagesofcharacters', name)
}

const getUniqueNames = (characters = []) => {
  const names = characters.map((character) => character?.name).filter(Boolean)
  return Array.from(new Set(names))
}

export default function GuessInput({
  onGuessSubmit,
  onReset,
  isDisabled = false,
  hideWhenDisabled = true,
  allCharacters = [],
  guesses = [],
  showSuggestionImages = true
}) {
  const [input, setInput] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const guessedNames = useMemo(() => {
    return new Set(
      guesses
        .map((guess) => guess?.character?.name)
        .filter(Boolean)
        .map((name) => name.toLowerCase())
    )
  }, [guesses])

  const suggestions = useMemo(() => getUniqueNames(allCharacters), [allCharacters])

  const filteredSuggestions = useMemo(() => {
    const query = input.trim().toLowerCase()
    if (!query) return []

    return suggestions
      .filter((name) => name.toLowerCase().includes(query))
      .filter((name) => !guessedNames.has(name.toLowerCase()))
      .slice(0, 50)
  }, [input, suggestions, guessedNames])

  useEffect(() => {
    const query = input.trim()
    if (!query) {
      setHighlightIndex(-1)
      return
    }

    setHighlightIndex(filteredSuggestions.length > 0 ? 0 : -1)
  }, [input, filteredSuggestions])

  useEffect(() => {
    if (!showSuggestionImages) return
    if (!allCharacters.length) return

    getUniqueNames(allCharacters).forEach((name) => {
      const url = getCharacterImageUrl(name)
      if (!url) return

      const img = new Image()
      img.src = url
    })
  }, [allCharacters, showSuggestionImages])

  const submitGuess = (value) => {
    if (!value.trim()) return
    onGuessSubmit(value)
    setInput('')
    setHighlightIndex(-1)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      if (filteredSuggestions.length === 0) return
      event.preventDefault()
      setHighlightIndex((prev) => {
        const next = prev + 1
        return next >= filteredSuggestions.length ? 0 : next
      })
      return
    }

    if (event.key === 'ArrowUp') {
      if (filteredSuggestions.length === 0) return
      event.preventDefault()
      setHighlightIndex((prev) => {
        const next = prev - 1
        return next < 0 ? filteredSuggestions.length - 1 : next
      })
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < filteredSuggestions.length) {
        submitGuess(filteredSuggestions[highlightIndex])
      } else {
        submitGuess(input)
      }
    }
  }

  return (
    <div>
      <div className="guess-input">
        {!(isDisabled && hideWhenDisabled) && (
          <div className="guess-row">
            <button type="button" onClick={onReset} disabled={!onReset}>
              Reset
            </button>
            <input
              type="text"
              value={input}
              disabled={isDisabled}
              onChange={(event) => {
                setInput(event.target.value)
                setHighlightIndex(-1)
              }}
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => submitGuess(input)} disabled={isDisabled}>Guess</button>
          </div>
        )}

        {!isDisabled && filteredSuggestions.length > 0 && (
          <div className="suggestion-list">
            {filteredSuggestions.map((name, index) => (
              <button
                key={name}
                type="button"
                className={`suggestion-item${index === highlightIndex ? ' is-active' : ''}`}
                onClick={() => submitGuess(name)}
                disabled={isDisabled}
              >
                {showSuggestionImages && (
                  <img src={getCharacterImageUrl(name)} alt={name} loading="eager" />
                )}
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
