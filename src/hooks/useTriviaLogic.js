import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { fetchLatestDailyPick } from '../utils/dailyPick'
import { readStoredState, writeStoredState } from '../utils/storageState'

const TRIVIA_GUESSES_STORAGE_KEY = 'soulsdle:triviaGuesses'

const getTodayKey = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const hashString = (value) => {
  const text = String(value || '')
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const pickFallbackTrivia = (items) => {
  if (!items.length) return { trivia: null, dayKey: '' }
  const dayKey = getTodayKey()
  const index = hashString(dayKey) % items.length
  return { trivia: items[index], dayKey }
}

const getAnswerId = (trivia) => {
  const rawAnswer = trivia?.Answer ?? trivia?.answer ?? trivia?.character_id
  if (Array.isArray(rawAnswer)) {
    return rawAnswer[0]?.id ?? rawAnswer[0]?.ID ?? null
  }

  if (rawAnswer && typeof rawAnswer === 'object') {
    return rawAnswer.id ?? rawAnswer.ID ?? null
  }

  return rawAnswer ?? null
}

export default function useTriviaLogic() {
  const [allCharacters, setAllCharacters] = useState([])
  const [targetTrivia, setTargetTrivia] = useState(null)
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

    const parsed = readStoredState(TRIVIA_GUESSES_STORAGE_KEY)
    const isSameDay = parsed?.dateKey === activeDayKey
    setGuesses(isSameDay && Array.isArray(parsed.guesses) ? parsed.guesses : [])
    setFirstClueUnlocked(isSameDay ? Boolean(parsed.firstClueUnlocked) : false)
    setSecondClueUnlocked(isSameDay ? Boolean(parsed.secondClueUnlocked) : false)
  }, [activeDayKey])

  useEffect(() => {
    if (!activeDayKey) return
    writeStoredState(TRIVIA_GUESSES_STORAGE_KEY, { dateKey: activeDayKey, guesses, firstClueUnlocked, secondClueUnlocked })
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

      try {
        const [{ data: characterData, error: characterError }, { data: triviaData, error: triviaError }] = await Promise.all([
          supabase.from('soulsdle').select('*'),
          supabase.from('Trivia').select('*')
        ])

        if (!isMounted) return

        if (characterError || triviaError) {
          setError(characterError?.message || triviaError?.message || 'Failed to load trivia')
          setAllCharacters([])
          setTargetTrivia(null)
          setActiveDayKey('')
          return
        }

        const characters = Array.isArray(characterData) ? characterData : []
        const rawTrivia = Array.isArray(triviaData) ? triviaData : []
        setAllCharacters(characters)

        if (!rawTrivia.length) {
          setTargetTrivia(null)
          setActiveDayKey('')
          setError('No trivia questions are readable yet. Check that the Trivia row exists and has a public select policy.')
          return
        }

        const { pick, error: pickError } = await fetchLatestDailyPick('trivia')
        if (!isMounted) return

        if (pickError) {
          const fallback = pickFallbackTrivia(rawTrivia)
          setActiveDayKey(fallback.dayKey)
          setTargetTrivia(fallback.trivia)
          setError(fallback.trivia ? null : pickError)
          return
        }

        setActiveDayKey(String(pick.day))
        const byId = pick.item_key
          ? rawTrivia.find((trivia) => String(trivia?.id) === String(pick.item_key))
          : null
        const resolved = byId || pick.payload || null
        setTargetTrivia(resolved)
        setError(resolved ? null : 'Daily pick payload missing')
      } catch (loadError) {
        if (!isMounted) return
        setError(loadError?.message || 'Failed to load trivia')
        setAllCharacters([])
        setTargetTrivia(null)
        setActiveDayKey('')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
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
    if (!targetTrivia) return null
    return characterById.get(String(getAnswerId(targetTrivia))) || null
  }, [targetTrivia, characterById])

  const addGuess = (guessName) => {
    if (!guessName.trim()) return
    if (!targetCharacter) return

    const guessedCharacter = allCharacters.find(
      (character) => character.name.toLowerCase() === guessName.toLowerCase()
    )
    if (!guessedCharacter) return

    const isCorrect = String(guessedCharacter.id) === String(targetCharacter.id)
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

  const firstClueQuote = targetCharacter?.game || null
  const secondClueQuote = targetCharacter?.location || null

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
    targetTrivia,
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
