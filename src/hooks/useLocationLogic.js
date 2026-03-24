import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const LOCATIONS_STORAGE_KEY = 'soulsdle:locationGuesses'

const LOCATION_NAME_FIXES = {
  dephts: 'Depths'
}

const normalizeLocationName = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return LOCATION_NAME_FIXES[trimmed.toLowerCase()] || trimmed
}

const readStoredState = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export default function useLocationLogic() {
  const [allLocations, setAllLocations] = useState([])
  const [targetLocation, setTargetLocation] = useState(null)
  const [activeDayKey, setActiveDayKey] = useState('')
  const [guesses, setGuesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    try {
      localStorage.setItem(
        LOCATIONS_STORAGE_KEY,
        JSON.stringify({ dateKey: activeDayKey, guesses })
      )
    } catch {
      // ignore
    }
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
          name: normalizeLocationName(location?.location_name || location?.Location_Name || '')
        }))
        .filter((location) => Boolean(location.name))

      setAllLocations(normalized)
      if (!normalized.length) {
        setTargetLocation(null)
        setActiveDayKey('')
        setLoading(false)
        return
      }

      const { data: dailyPicks, error: dailyPickError } = await supabase
        .from('daily_picks')
        .select('day,item_key,payload')
        .eq('mode', 'location')
        .order('day', { ascending: false })
        .limit(1)

      if (!isMounted) return

      if (dailyPickError) {
        setError(dailyPickError.message || 'Failed to load daily pick')
        setTargetLocation(null)
        setActiveDayKey('')
        setLoading(false)
        return
      }

      const pick = dailyPicks?.[0] || null
      if (!pick) {
        setError('Daily pick not ready yet')
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
        payload?.name || payload?.location_name || payload?.Location_Name || ''
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

  return {
    allLocations,
    targetLocation,
    guesses,
    addGuess,
    resetGuesses,
    loading,
    error,
    isSolved
  }
}
