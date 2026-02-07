import { useMemo, useState } from "react"
import { supabase } from '../../services/supabase'

export default function GuessInput({ onGuessSubmit, allCharacters = [], guesses = [] }) {
  const [input, setInput] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const getCharacterImageUrl = (name) => {
    if (!name) return ''
    const fileName = `${name}.jpg`
    return supabase.storage.from('imagesofcharacters').getPublicUrl(fileName).data.publicUrl
  }

  const guessedNames = useMemo(() => {
    return new Set(
      guesses
        .map(g => g?.character?.name)
        .filter(Boolean)
        .map(name => name.toLowerCase())
    )
  }, [guesses])

  const suggestions = useMemo(() => {
    const names = allCharacters
      .map(c => c?.name)
      .filter(Boolean)
    return Array.from(new Set(names))
  }, [allCharacters])

  const filteredSuggestions = useMemo(() => {
    const query = input.trim().toLowerCase()
    if (!query) return []
    return suggestions
      .filter(name => name.toLowerCase().includes(query))
      .filter(name => !guessedNames.has(name.toLowerCase()))
      .slice(0, 6)
  }, [input, suggestions, guessedNames])

  const selectSuggestion = (name) => {
    setInput(name)
    setHighlightIndex(-1)
  }

  const submitGuess = (value) => {
    if (!value.trim()) return
    onGuessSubmit(value)
    setInput('')
    setHighlightIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      if (filteredSuggestions.length === 0) return
      e.preventDefault()
      setHighlightIndex((prev) => {
        const next = prev + 1
        return next >= filteredSuggestions.length ? 0 : next
      })
      return
    }

    if (e.key === 'ArrowUp') {
      if (filteredSuggestions.length === 0) return
      e.preventDefault()
      setHighlightIndex((prev) => {
        const next = prev - 1
        return next < 0 ? filteredSuggestions.length - 1 : next
      })
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightIndex >= 0 && highlightIndex < filteredSuggestions.length) {
        const selected = filteredSuggestions[highlightIndex]
        submitGuess(selected)
      } else {
        submitGuess(input)
      }
    }
  }

  const handleSubmit = () => {
    submitGuess(input)
  }


  return (
    <div>
      <div className="guess-input">
        <div className="guess-row">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setHighlightIndex(-1)
            }}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleSubmit}>Guess</button>
        </div>
        {filteredSuggestions.length > 0 && (
          <div className="suggestion-list">
            {filteredSuggestions.map((name, index) => (
              <button
                key={name}
                type="button"
                className={`suggestion-item${index === highlightIndex ? ' is-active' : ''}`}
                onClick={() => selectSuggestion(name)}
              >
                <img src={getCharacterImageUrl(name)} alt={name} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
