import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import getQuoteOfDay from '../utils/quoteOfDay'

export default function useQuoteLogic() {
  const QUOTE_GUESSES_STORAGE_KEY = 'soulsdle:quote-guesses'
  const [allCharacters, setAllCharacters] = useState([])
  const [quotes, setQuotes] = useState([])
  const [targetQuote, setTargetQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastGuessCorrect, setLastGuessCorrect] = useState(null)

  const [guesses, setGuesses] = useState(() => {
    try {
      const raw = localStorage.getItem(QUOTE_GUESSES_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(QUOTE_GUESSES_STORAGE_KEY, JSON.stringify(guesses))
    } catch {
      // Ignore storage errors (e.g. private mode or quota).
    }
  }, [guesses, QUOTE_GUESSES_STORAGE_KEY])

  const resetGuesses = () => {
    setGuesses([])
    setLastGuessCorrect(null)
  }

  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      setLoading(true)
      setError(null)

      const [{ data: characterData, error: characterError }, { data: quoteData, error: quoteError }] = await Promise.all([
        supabase.from('soulsdle').select('*'),
        supabase.from('quotes').select('*')
      ])

      if (!isMounted) return

      if (characterError || quoteError) {
        setError(characterError?.message || quoteError?.message || 'Failed to load data')
        setAllCharacters([])
        setQuotes([])
        setTargetQuote(null)
      } else {
        const characters = Array.isArray(characterData) ? characterData : []
        const rawQuotes = Array.isArray(quoteData) ? quoteData : []
        setAllCharacters(characters)
        setQuotes(rawQuotes)
        setTargetQuote(getQuoteOfDay(rawQuotes))
      }

      setLoading(false)
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const characterById = useMemo(() => {
    return new Map(allCharacters.map(c => [String(c.id), c]))
  }, [allCharacters])

  const targetCharacter = useMemo(() => {
    if (!targetQuote) return null
    return characterById.get(String(targetQuote.character_id)) || null
  }, [targetQuote, characterById])

  const addGuess = (guessName) => {
    if (!guessName.trim()) return
    if (!targetCharacter) return

    const guessedCharacter = allCharacters.find(
      c => c.name.toLowerCase() === guessName.toLowerCase()
    )

    if (!guessedCharacter) return

    const isCorrect = guessedCharacter.id === targetCharacter.id
    setLastGuessCorrect(isCorrect)
    setGuesses(prev => [...prev, { character: guessedCharacter }])
  }

  const isSolved = Boolean(
    targetCharacter &&
    guesses.some(g => String(g?.character?.id) === String(targetCharacter?.id))
  )

  return {
    guesses,
    addGuess,
    resetGuesses,
    targetQuote,
    targetCharacter,
    allCharacters,
    loading,
    error,
    isSolved,
    lastGuessCorrect
  }
}
