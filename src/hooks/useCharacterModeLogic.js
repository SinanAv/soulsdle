import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'
import { fetchLatestDailyPick } from '../utils/dailyPick'
import { readStoredState, writeStoredState } from '../utils/storageState'

const CHARACTER_PROPERTIES = ['name', 'gender', 'game', 'occupation', 'species', 'location', 'damage_type', 'weapon_type', 'HP']

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

export const occupationIncludesBoss = (occupation) => {
  if (occupation == null) return false
  if (Array.isArray(occupation)) {
    return occupation.some((value) => String(value).toLowerCase().includes('boss'))
  }
  return String(occupation).toLowerCase().includes('boss')
}

export default function useCharacterModeLogic({
  mode,
  storageKey,
  includeBosses = false,
  invalidPickMessage
}) {
  const shouldIncludeCharacter = useMemo(() => {
    return (character) => {
      const isBoss = occupationIncludesBoss(character?.occupation)
      return includeBosses ? isBoss : !isBoss
    }
  }, [includeBosses])

  const [allCharacters, setAllCharacters] = useState([])
  const [quotes, setQuotes] = useState([])
  const [targetCharacter, setTargetCharacter] = useState(null)
  const [activeDayKey, setActiveDayKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [guesses, setGuesses] = useState([])

  useEffect(() => {
    if (!activeDayKey) return

    const parsed = readStoredState(storageKey)
    const isSameDay = parsed?.dateKey === activeDayKey
    setGuesses(isSameDay && Array.isArray(parsed.guesses) ? parsed.guesses : [])
  }, [activeDayKey, storageKey])

  useEffect(() => {
    if (!activeDayKey) return
    writeStoredState(storageKey, { dateKey: activeDayKey, guesses })
  }, [activeDayKey, guesses, storageKey])

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
        setLoading(false)
        return
      }

      const characters = Array.isArray(characterData) ? characterData : []
      const filteredCharacters = characters.filter(shouldIncludeCharacter)
      const rawQuotes = Array.isArray(quoteData) ? quoteData : []
      setAllCharacters(filteredCharacters)
      setQuotes(rawQuotes)

      const { pick, error: pickError } = await fetchLatestDailyPick(mode)
      if (!isMounted) return

      if (pickError) {
        setError(pickError)
        setTargetCharacter(null)
        setActiveDayKey('')
        setLoading(false)
        return
      }

      setActiveDayKey(String(pick.day))

      const byId = pick.item_key
        ? filteredCharacters.find((character) => String(character?.id) === String(pick.item_key))
        : null
      const resolved = byId || pick.payload || null

      if (resolved && !shouldIncludeCharacter(resolved)) {
        setTargetCharacter(null)
        setError(invalidPickMessage || 'Daily pick is invalid for this mode.')
      } else {
        setTargetCharacter(resolved)
        setError(resolved ? null : 'Daily pick payload missing')
      }

      setLoading(false)
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [mode, shouldIncludeCharacter, invalidPickMessage])

  const addGuess = (guessName) => {
    if (!guessName.trim()) return
    if (!targetCharacter) return

    const guessedCharacter = allCharacters.find(
      (character) => character.name.toLowerCase() === guessName.toLowerCase()
    )
    if (!guessedCharacter) return

    const clues = {}
    CHARACTER_PROPERTIES.forEach((property) => {
      if (guessedCharacter[property] === targetCharacter[property]) {
        clues[property] = 'green'
        return
      }

      const isNumber = typeof guessedCharacter[property] === 'number' || typeof targetCharacter[property] === 'number'
      if (isNumber) {
        clues[property] = 'red'
        return
      }

      const guessSet = toValueSet(guessedCharacter[property])
      const targetSet = toValueSet(targetCharacter[property])
      const hasOverlap = [...guessSet].some((value) => targetSet.has(value))
      clues[property] = hasOverlap ? 'yellow' : 'red'
    })

    setGuesses((prev) => [...prev, { character: guessedCharacter, clues }])
  }

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
    quotes,
    loading,
    error,
    isSolved
  }
}
