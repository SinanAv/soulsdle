import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

const QUOTE_GUESSES_STORAGE_KEY = 'soulsdle:quote-guesses'

const readStoredState = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export default function useQuoteLogic() {
  const [allCharacters, setAllCharacters] = useState([])
  const [quotes, setQuotes] = useState([])
  const [targetQuote, setTargetQuote] = useState(null)
  const [activeDayKey, setActiveDayKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastGuessCorrect, setLastGuessCorrect] = useState(null)
  const [firstHintRevealed, setFirstHintRevealed] = useState(false)
  const [secondHintRevealed, setSecondHintRevealed] = useState(false)

  const [guesses, setGuesses] = useState([])
  const [firstHintUnlocked, setFirstHintUnlocked] = useState(false)
  const [secondHintUnlocked, setSecondHintUnlocked] = useState(false)

  useEffect(() => {
    if (!activeDayKey) return

    const parsed = readStoredState(QUOTE_GUESSES_STORAGE_KEY)
    setGuesses(parsed?.dateKey === activeDayKey && Array.isArray(parsed.guesses) ? parsed.guesses : [])
    setFirstHintUnlocked(parsed?.dateKey === activeDayKey ? Boolean(parsed.firstHintUnlocked) : false)
    setSecondHintUnlocked(parsed?.dateKey === activeDayKey ? Boolean(parsed.secondHintUnlocked) : false)
  }, [activeDayKey])

  useEffect(() => {
    if (!activeDayKey) return
    try {
      localStorage.setItem(
        QUOTE_GUESSES_STORAGE_KEY,
        JSON.stringify({ dateKey: activeDayKey, guesses, firstHintUnlocked, secondHintUnlocked })
      )
    } catch {
      // Ignore storage errors (e.g. private mode or quota).
    }
  }, [activeDayKey, guesses, firstHintUnlocked, secondHintUnlocked])

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
        setActiveDayKey('')
      } else {
        const characters = Array.isArray(characterData) ? characterData : []
        const rawQuotes = Array.isArray(quoteData) ? quoteData : []
        setAllCharacters(characters)
        setQuotes(rawQuotes)

        const { data: dailyPicks, error: dailyPickError } = await supabase
          .from('daily_picks')
          .select('day,payload')
          .eq('mode', 'quote')
          .order('day', { ascending: false })
          .limit(1)

        if (dailyPickError) {
          setError(dailyPickError.message || 'Failed to load daily pick')
          setTargetQuote(null)
          setActiveDayKey('')
        } else {
          const pick = dailyPicks?.[0] || null
          if (!pick?.payload) {
            setError('Daily pick not ready yet')
            setTargetQuote(null)
            setActiveDayKey('')
          } else {
            setActiveDayKey(String(pick.day))
            setTargetQuote(pick.payload)
          }
        }
      }

      setLoading(false)
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const characterById = useMemo(() => {
    return new Map(allCharacters.map((character) => [String(character.id), character]))
  }, [allCharacters])

  const targetCharacter = useMemo(() => {
    if (!targetQuote) return null
    return characterById.get(String(targetQuote.character_id)) || null
  }, [targetQuote, characterById])

  const addGuess = (guessName) => {
    if (!guessName.trim()) return
    if (!targetCharacter) return

    const guessedCharacter = allCharacters.find(
      (character) => character.name.toLowerCase() === guessName.toLowerCase()
    )
    if (!guessedCharacter) return

    const isCorrect = guessedCharacter.id === targetCharacter.id
    setLastGuessCorrect(isCorrect)
    setGuesses((prev) => [...prev, { character: guessedCharacter }])

    if (!isCorrect && !firstHintUnlocked) {
      setFirstHintUnlocked(true)
    }

    if (!isCorrect) {
      const wrongGuessesToday = guesses.filter(
        (guess) => String(guess?.character?.id) !== String(targetCharacter?.id)
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
      .filter((quote) => String(quote?.character_id) === String(targetCharacter?.id) && quote?.quote)
      .map((quote) => String(quote.quote).trim())
      .filter((quoteText) => {
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
    setFirstHintRevealed((prev) => !prev)
  }

  const toggleSecondHint = () => {
    if (!secondHintUnlocked) return
    setSecondHintRevealed((prev) => !prev)
  }

  const isSolved = Boolean(
    targetCharacter && guesses.some((guess) => String(guess?.character?.id) === String(targetCharacter?.id))
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
