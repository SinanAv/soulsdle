import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { fetchLatestDailyPick } from '../utils/dailyPick'
import { readStoredState, writeStoredState } from '../utils/storageState'

const LOCATIONS_STORAGE_KEY = 'soulsdle:locationGuesses'

const LOCATION_NAME_FIXES = {
  dephts: 'Depths'
}

const normalizeLocationName = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return LOCATION_NAME_FIXES[trimmed.toLowerCase()] || trimmed
}

export default function useLocationLogic() {
  const [allLocations, setAllLocations] = useState([])
  const [targetLocation, setTargetLocation] = useState(null)
  const [activeDayKey, setActiveDayKey] = useState('')
  const [guesses, setGuesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gameClueRevealed, setGameClueRevealed] = useState(false)

  useEffect(() => {
    if (!activeDayKey) return
    const stored = readStoredState(LOCATIONS_STORAGE_KEY)
    setGuesses(
      stored?.dateKey === activeDayKey && Array.isArray(stored.guesses)
        ? stored.guesses.map(normalizeLocationName).filter(Boolean)
        : []
    )
  }, [activeDayKey])

  useEffect(() => {
    if (!activeDayKey) return
    writeStoredState(LOCATIONS_STORAGE_KEY, { dateKey: activeDayKey, guesses })
  }, [activeDayKey, guesses])

  useEffect(() => {
    let isMounted = true

    const loadLocations = async () => {
      setLoading(true)
      setError(null)

      const { data, error: supabaseError } = await supabase.from('Locations').select('*')
      if (!isMounted) return

      if (supabaseError) {
        setError(supabaseError.message || 'Failed to load locations')
        setAllLocations([])
        setTargetLocation(null)
        setLoading(false)
        return
      }

      const normalized = (Array.isArray(data) ? data : [])
        .map((location) => ({
          ...location,
          name: normalizeLocationName(location?.location || '')
        }))
        .filter((location) => Boolean(location.name))

      setAllLocations(normalized)
      if (!normalized.length) {
        setTargetLocation(null)
        setActiveDayKey('')
        setLoading(false)
        return
      }

      const { pick, error: pickError } = await fetchLatestDailyPick('location')
      if (!isMounted) return

      if (pickError) {
        setError(pickError)
        setTargetLocation(null)
        setActiveDayKey('')
        setLoading(false)
        return
      }

      setActiveDayKey(String(pick.day))

      const pickKey = String(pick.item_key || '').trim()
      const byId = pickKey ? normalized.find((location) => String(location?.id) === pickKey) : null
      const byName = !byId && pickKey
        ? normalized.find((location) => location.name.toLowerCase() === normalizeLocationName(pickKey).toLowerCase())
        : null

      const payload = pick.payload
      const payloadName = normalizeLocationName(
        payload?.location || ''
      )
      const byPayload = !byId && !byName && payloadName
        ? normalized.find((location) => location.name.toLowerCase() === payloadName.toLowerCase())
        : null

      const resolved =
        byId ||
        byName ||
        byPayload ||
        (payloadName ? { ...payload, name: payloadName } : null)

      setTargetLocation(resolved)
      setError(resolved ? null : 'Daily pick payload missing')

      setLoading(false)
    }

    loadLocations()

    return () => {
      isMounted = false
    }
  }, [])

  const resetGuesses = () => {
    setGuesses([])
  }

  const addGuess = (guessName) => {
    const fixedGuess = normalizeLocationName(guessName)
    if (!fixedGuess) return
    const normalized = fixedGuess.toLowerCase()

    const match = allLocations.find(
      (location) => location.name.toLowerCase() === normalized
    )
    if (!match) return
    if (guesses.some((name) => name.toLowerCase() === normalized)) return

    setGuesses((prev) => [...prev, match.name])
  }

  const isSolved = Boolean(
    targetLocation &&
      guesses.some((name) => name.toLowerCase() === targetLocation.name.toLowerCase())
  )

  const wrongGuessesToday = targetLocation
    ? guesses.filter((name) => String(name || '').toLowerCase() !== String(targetLocation?.name || '').toLowerCase()).length
    : 0
  const gameClueUnlocked = wrongGuessesToday >= 1

  const toggleGameClue = () => {
    if (!gameClueUnlocked) return
    setGameClueRevealed((prev) => !prev)
  }

  const gameClueValue = targetLocation?.game || null

  return {
    allLocations,
    targetLocation,
    guesses,
    addGuess,
    resetGuesses,
    loading,
    error,
    isSolved,
    gameClueUnlocked,
    gameClueRevealed,
    toggleGameClue,
    gameClueValue
  }
}
