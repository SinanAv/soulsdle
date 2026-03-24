import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

const GUESSES_STORAGE_KEY = 'soulsdle:guesses'
const CHARACTER_PROPERTIES = ['name', 'gender', 'game', 'occupation', 'species', 'location', 'damage_type', 'weapon_type', 'HP']

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
  const [allCharacters, setAllCharacters] = useState([])
  const [quotes, setQuotes] = useState([])
  const [targetCharacter, setTargetCharacter] = useState(null)
  const [activeDayKey, setActiveDayKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [firstHintRevealed, setFirstHintRevealed] = useState(false)
  const [locationHintRevealed, setLocationHintRevealed] = useState(false)

  const [guesses, setGuesses] = useState([])
  const [firstHintUnlocked, setFirstHintUnlocked] = useState(false)
  const [locationHintUnlocked, setLocationHintUnlocked] = useState(false)

  useEffect(() => {
    if (!activeDayKey) return

    const parsed = readStoredState(GUESSES_STORAGE_KEY)
    setGuesses(parsed?.dateKey === activeDayKey && Array.isArray(parsed.guesses) ? parsed.guesses : [])
    setFirstHintUnlocked(parsed?.dateKey === activeDayKey ? Boolean(parsed.firstHintUnlocked) : false)
    setLocationHintUnlocked(
      parsed?.dateKey === activeDayKey
        ? Boolean(parsed.locationHintUnlocked || parsed.nameLengthHintUnlocked)
        : false
    )
  }, [activeDayKey])

  useEffect(() => {
    if (!activeDayKey) return
    try {
      localStorage.setItem(
        GUESSES_STORAGE_KEY,
        JSON.stringify({ dateKey: activeDayKey, guesses, firstHintUnlocked, locationHintUnlocked })
      )
    } catch {
      // Ignore storage errors.
    }
  }, [activeDayKey, guesses, firstHintUnlocked, locationHintUnlocked])

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
        setActiveDayKey('')
      } else {
        const characters = Array.isArray(characterData) ? characterData : []
        const rawQuotes = Array.isArray(quoteData) ? quoteData : []
        setAllCharacters(characters)
        setQuotes(rawQuotes)

        const { data: dailyPicks, error: dailyPickError } = await supabase
          .from('daily_picks')
          .select('day,item_key,payload')
          .eq('mode', 'character')
          .order('day', { ascending: false })
          .limit(1)

        if (dailyPickError) {
          setError(dailyPickError.message || 'Failed to load daily pick')
          setTargetCharacter(null)
          setActiveDayKey('')
        } else {
          const pick = dailyPicks?.[0] || null
          if (!pick) {
            setError('Daily pick not ready yet')
            setTargetCharacter(null)
            setActiveDayKey('')
          } else {
            setActiveDayKey(String(pick.day))
            const byId = pick.item_key
              ? characters.find((character) => String(character?.id) === String(pick.item_key))
              : null
            const resolved = byId || pick.payload || null
            setTargetCharacter(resolved)
            setError(resolved ? null : 'Daily pick payload missing')
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
    dailyPickDay: activeDayKey,
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
