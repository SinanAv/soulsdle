import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import getQuoteOfDay from '../utils/quoteOfDay'

const getTodayKey = () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function useQuoteLogic() {
  const QUOTE_GUESSES_STORAGE_KEY = 'soulsdle:quote-guesses'
  const todayKey = getTodayKey()
  const [allCharacters, setAllCharacters] = useState([])
  const [quotes, setQuotes] = useState([])
  const [targetQuote, setTargetQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastGuessCorrect, setLastGuessCorrect] = useState(null)
  const [firstHintRevealed, setFirstHintRevealed] = useState(false)
  const [secondHintRevealed, setSecondHintRevealed] = useState(false)

  const [guesses, setGuesses] = useState(() => {
    try {
      const raw = localStorage.getItem(QUOTE_GUESSES_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return []
      if (parsed && typeof parsed === 'object') {
        if (parsed.dateKey === todayKey && Array.isArray(parsed.guesses)) {
          return parsed.guesses
        }
      }
      return []
    } catch {
      return []
    }
  })

  const [firstHintUnlocked, setFirstHintUnlocked] = useState(() => {
    try {
      const raw = localStorage.getItem(QUOTE_GUESSES_STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && parsed.dateKey === todayKey) {
        return Boolean(parsed.firstHintUnlocked)
      }
      return false
    } catch {
      return false
    }
  })

  const [secondHintUnlocked, setSecondHintUnlocked] = useState(() => {
    try {
      const raw = localStorage.getItem(QUOTE_GUESSES_STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && parsed.dateKey === todayKey) {
        return Boolean(parsed.secondHintUnlocked)
      }
      return false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        QUOTE_GUESSES_STORAGE_KEY,
        JSON.stringify({ dateKey: todayKey, guesses, firstHintUnlocked, secondHintUnlocked })
      )
    } catch {
      // Ignore storage errors (e.g. private mode or quota).
    }
  }, [guesses, firstHintUnlocked, secondHintUnlocked, QUOTE_GUESSES_STORAGE_KEY, todayKey])

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
        setTargetQuote(await getQuoteOfDay(rawQuotes))
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

    if (!isCorrect && !firstHintUnlocked) {
      setFirstHintUnlocked(true)
    }

    if (!isCorrect) {
      const wrongGuessesToday = guesses.filter(
        g => String(g?.character?.id) !== String(targetCharacter?.id)
      ).length + 1

      if (wrongGuessesToday >= 3 && !secondHintUnlocked) {
        setSecondHintUnlocked(true)
      }
    }
  }

  const hintQuotes = useMemo(() => {
    if (!targetCharacter || quotes.length === 0) return []
    const targetQuoteText = String(targetQuote?.quote || '').trim().toLowerCase()
    const seen = new Set()

    return quotes
      .filter(q => String(q?.character_id) === String(targetCharacter?.id) && q?.quote)
      .map(q => String(q.quote).trim())
      .filter(quoteText => {
        const normalized = quoteText.toLowerCase()
        if (!normalized || normalized === targetQuoteText || seen.has(normalized)) return false
        seen.add(normalized)
        return true
      })
  }, [quotes, targetCharacter, targetQuote])

  const firstHintQuote = hintQuotes[0] || null
  const secondHintQuote = hintQuotes[1] || null

  const toggleFirstHint = () => {
    if (!firstHintUnlocked) return
    setFirstHintRevealed(prev => !prev)
  }

  const toggleSecondHint = () => {
    if (!secondHintUnlocked) return
    setSecondHintRevealed(prev => !prev)
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
    lastGuessCorrect,
    firstHintUnlocked,
    firstHintRevealed,
    firstHintQuote,
    toggleFirstHint,
    secondHintUnlocked,
    secondHintRevealed,
    secondHintQuote,
    toggleSecondHint
  }
}

