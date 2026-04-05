import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { fetchLatestDailyPick } from '../utils/dailyPick'
import { readStoredState, writeStoredState } from '../utils/storageState'

const QUOTE_GUESSES_STORAGE_KEY = 'soulsdle:quoteGuesses'

export default function useQuoteLogic() {
  const [allCharacters, setAllCharacters] = useState([])
  const [targetQuote, setTargetQuote] = useState(null)
  const [activeDayKey, setActiveDayKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastGuessCorrect, setLastGuessCorrect] = useState(null)
  const [firstClueRevealed, setFirstClueRevealed] = useState(false)
  const [secondClueRevealed, setSecondClueRevealed] = useState(false)

  const [guesses, setGuesses] = useState([])
  const [firstClueUnlocked, setFirstClueUnlocked] = useState(false)
  const [secondClueUnlocked, setSecondClueUnlocked] = useState(false)

  useEffect(() => {
    if (!activeDayKey) return

    const parsed = readStoredState(QUOTE_GUESSES_STORAGE_KEY)
    const isSameDay = parsed?.dateKey === activeDayKey
    setGuesses(isSameDay && Array.isArray(parsed.guesses) ? parsed.guesses : [])
    setFirstClueUnlocked(isSameDay ? Boolean(parsed.firstClueUnlocked) : false)
    setSecondClueUnlocked(isSameDay ? Boolean(parsed.secondClueUnlocked) : false)
  }, [activeDayKey])

  useEffect(() => {
    if (!activeDayKey) return
    writeStoredState(QUOTE_GUESSES_STORAGE_KEY, { dateKey: activeDayKey, guesses, firstClueUnlocked, secondClueUnlocked })
  }, [activeDayKey, guesses, firstClueUnlocked, secondClueUnlocked])

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
        setTargetQuote(null)
        setActiveDayKey('')
      } else {
        const characters = Array.isArray(characterData) ? characterData : []
        const rawQuotes = Array.isArray(quoteData) ? quoteData : []
        setAllCharacters(characters)

        const { pick, error: pickError } = await fetchLatestDailyPick('quote')

        if (pickError) {
          setError(pickError)
          setTargetQuote(null)
          setActiveDayKey('')
        } else {
          setActiveDayKey(String(pick.day))
          const byId = pick.item_key
            ? rawQuotes.find((quote) => String(quote?.id) === String(pick.item_key))
            : null
          const resolved = byId || pick.payload || null
          setTargetQuote(resolved)
          setError(resolved ? null : 'Daily pick payload missing')
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

    if (!isCorrect && !firstClueUnlocked) {
      setFirstClueUnlocked(true)
    }

    if (!isCorrect) {
      const wrongGuessesToday = guesses.filter(
        (guess) => String(guess?.character?.id) !== String(targetCharacter?.id)
      ).length + 1

      if (wrongGuessesToday >= 3 && !secondClueUnlocked) {
        setSecondClueUnlocked(true)
      }
    }
  }

  const firstClueQuote = useMemo(() => {
    if (!targetCharacter) return null
    return targetCharacter.game || null
  }, [targetCharacter])

  const secondClueQuote = useMemo(() => {
    if (!targetCharacter) return null
    return targetCharacter.location || null
  }, [targetCharacter])

  const toggleFirstClue = () => {
    if (!firstClueUnlocked) return
    setFirstClueRevealed((prev) => !prev)
  }

  const toggleSecondClue = () => {
    if (!secondClueUnlocked) return
    setSecondClueRevealed((prev) => !prev)
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
    firstClueUnlocked,
    firstClueRevealed,
    firstClueQuote,
    toggleFirstClue,
    secondClueUnlocked,
    secondClueRevealed,
    secondClueQuote,
    toggleSecondClue
  }
}
