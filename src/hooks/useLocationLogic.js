import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import getDailyItem from '../utils/getDailyItem'

const LOCATIONS_STORAGE_KEY = 'soulsdle:locationGuesses'

const LOCATION_NAME_FIXES = {
  dephts: 'Depths'
}

const normalizeLocationName = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  return LOCATION_NAME_FIXES[trimmed.toLowerCase()] || trimmed
}

const getTodayKey = () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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
  const todayKey = getTodayKey()
  const [allLocations, setAllLocations] = useState([])
  const [targetLocation, setTargetLocation] = useState(null)
  const [guesses, setGuesses] = useState(() => {
    const stored = readStoredState(LOCATIONS_STORAGE_KEY)
    if (!stored || stored.dateKey !== todayKey || !Array.isArray(stored.guesses)) return []
    return stored.guesses.map(normalizeLocationName).filter(Boolean)
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(
        LOCATIONS_STORAGE_KEY,
        JSON.stringify({ dateKey: todayKey, guesses })
      )
    } catch {
      // ignore
    }
  }, [guesses, todayKey])

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
      if (normalized.length > 0) {
        const selected = await getDailyItem(normalized)
        if (isMounted) {
          setTargetLocation(selected)
        }
      } else {
        setTargetLocation(null)
      }

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
