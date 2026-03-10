import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import getCharacterOfDay from '../utils/characterOfDay'

const GUESSES_STORAGE_KEY = 'soulsdle:guesses'
const CHARACTER_PROPERTIES = ['name', 'gender', 'game', 'occupation', 'species', 'location', 'damage_type', 'weapon_type', 'HP']

const getTodayKey = () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

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

const toValueSet = (value) => {
  if (value == null) return new Set()

  if (Array.isArray(value)) {
    return new Set(value.map((item) => String(item).trim().toLowerCase()).filter(Boolean))
  }

  if (typeof value === 'number') return new Set([String(value)])

  const normalized = String(value)
    .toLowerCase()
    .replace(/\s+and\s+/g, ',')
    .replace(/[/&]/g, ',')

  return new Set(
    normalized
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  )
}

const isNameMatch = (left, right) => {
  return String(left).toLowerCase() === String(right).toLowerCase()
}

export default function useGameLogic() {
  const todayKey = getTodayKey()
  const [allCharacters, setAllCharacters] = useState([])
  const [quotes, setQuotes] = useState([])
  const [targetCharacter, setTargetCharacter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [firstHintRevealed, setFirstHintRevealed] = useState(false)
  const [locationHintRevealed, setLocationHintRevealed] = useState(false)

  const [guesses, setGuesses] = useState(() => {
    const parsed = readStoredState(GUESSES_STORAGE_KEY)
    if (!parsed || parsed.dateKey !== todayKey || !Array.isArray(parsed.guesses)) return []
    return parsed.guesses
  })

  const [firstHintUnlocked, setFirstHintUnlocked] = useState(() => {
    const parsed = readStoredState(GUESSES_STORAGE_KEY)
    if (!parsed || parsed.dateKey !== todayKey) return false
    return Boolean(parsed.firstHintUnlocked)
  })

  const [locationHintUnlocked, setLocationHintUnlocked] = useState(() => {
    const parsed = readStoredState(GUESSES_STORAGE_KEY)
    if (!parsed || parsed.dateKey !== todayKey) return false
    return Boolean(parsed.locationHintUnlocked || parsed.nameLengthHintUnlocked)
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        GUESSES_STORAGE_KEY,
        JSON.stringify({ dateKey: todayKey, guesses, firstHintUnlocked, locationHintUnlocked })
      )
    } catch {
      // Ignore storage errors.
    }
  }, [guesses, firstHintUnlocked, locationHintUnlocked, todayKey])

  const resetGuesses = () => {
    setGuesses([])
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
        setTargetCharacter(null)
      } else {
        const characters = Array.isArray(characterData) ? characterData : []
        const rawQuotes = Array.isArray(quoteData) ? quoteData : []
        setAllCharacters(characters)
        setQuotes(rawQuotes)
        setTargetCharacter(await getCharacterOfDay(characters))
      }

      setLoading(false)
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  const firstHintQuote = useMemo(() => {
    if (!targetCharacter) return null

    const characterQuotes = quotes.filter(
      (quote) => String(quote?.character_id) === String(targetCharacter?.id) && quote?.quote
    )

    if (characterQuotes.length === 0) return null
    return characterQuotes[0]?.quote || null
  }, [quotes, targetCharacter])

  const addGuess = (guessName) => {
    if (!guessName.trim()) return
    if (!targetCharacter) return

    const guessedCharacter = allCharacters.find(
      (character) => character.name.toLowerCase() === guessName.toLowerCase()
    )
    if (!guessedCharacter) return

    const hints = {}
    CHARACTER_PROPERTIES.forEach((property) => {
      if (guessedCharacter[property] === targetCharacter[property]) {
        hints[property] = 'green'
        return
      }

      const isNumber = typeof guessedCharacter[property] === 'number' || typeof targetCharacter[property] === 'number'
      if (isNumber) {
        hints[property] = 'red'
        return
      }

      const guessSet = toValueSet(guessedCharacter[property])
      const targetSet = toValueSet(targetCharacter[property])
      const hasOverlap = [...guessSet].some((value) => targetSet.has(value))
      hints[property] = hasOverlap ? 'yellow' : 'red'
    })

    setGuesses((prev) => [...prev, { character: guessedCharacter, hints }])

    const guessedCorrectly = isNameMatch(guessedCharacter?.name, targetCharacter?.name)
    if (!guessedCorrectly && !firstHintUnlocked) {
      setFirstHintUnlocked(true)
    }

    if (!guessedCorrectly) {
      const wrongGuessesToday = guesses.filter(
        (guess) => !isNameMatch(guess?.character?.name, targetCharacter?.name)
      ).length + 1

      if (wrongGuessesToday >= 3 && !locationHintUnlocked) {
        setLocationHintUnlocked(true)
      }
    }
  }

  const toggleFirstHint = () => {
    if (!firstHintUnlocked) return
    setFirstHintRevealed((prev) => !prev)
  }

  const toggleLocationHint = () => {
    if (!locationHintUnlocked) return
    setLocationHintRevealed((prev) => !prev)
  }

  const locationHintValue = targetCharacter?.location || null

  const isSolved = Boolean(
    targetCharacter && guesses.some((guess) => isNameMatch(guess?.character?.name, targetCharacter?.name))
  )

  return {
    guesses,
    addGuess,
    resetGuesses,
    targetCharacter,
    allCharacters,
    loading,
    error,
    isSolved,
    firstHintQuote,
    firstHintUnlocked,
    firstHintRevealed,
    toggleFirstHint,
    locationHintUnlocked,
    locationHintRevealed,
    toggleLocationHint,
    locationHintValue
  }
}
