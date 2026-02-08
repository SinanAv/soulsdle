import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import getCharacterOfDay from '../utils/characterOfDay'

const getTodayKey = () => {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function useGameLogic() {
  const GUESSES_STORAGE_KEY = 'soulsdle:guesses'
  const todayKey = getTodayKey()
  const [allCharacters, setAllCharacters] = useState([])
  const [targetCharacter, setTargetCharacter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [guesses, setGuesses] = useState(() => {
    try {
      const raw = localStorage.getItem(GUESSES_STORAGE_KEY)
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

  useEffect(() => {
    try {
      localStorage.setItem(
        GUESSES_STORAGE_KEY,
        JSON.stringify({ dateKey: todayKey, guesses })
      )
    } catch {
    }
  }, [guesses, GUESSES_STORAGE_KEY, todayKey])

  const resetGuesses = () => {
    setGuesses([])
  }

  useEffect(() => {
    let isMounted = true

    const loadCharacters = async () => {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('soulsdle')
        .select('*')

      if (!isMounted) return

      if (fetchError) {
        setError(fetchError.message)
        setAllCharacters([])
        setTargetCharacter(null)
      } else {
        const characters = Array.isArray(data) ? data : []
        setAllCharacters(characters)
        setTargetCharacter(getCharacterOfDay(characters))
      }

      setLoading(false)
    }

    loadCharacters()

    return () => {
      isMounted = false
    }
  }, [])

  const addGuess = (guessName) => {
    if (!guessName.trim()) return
    if (!targetCharacter) return

    const guessedCharacter = allCharacters.find(
      c => c.name.toLowerCase() === guessName.toLowerCase()
    )

    if (!guessedCharacter) return 

    const properties = ['name','gender','game','occupation','species','location','damage_type','weapon_type','HP']
    const hints = {}

    const toValueSet = (value) => {
      if (value == null) return new Set()
      if (Array.isArray(value)) {
        return new Set(value.map(v => String(v).trim().toLowerCase()).filter(Boolean))
      }
      if (typeof value === 'number') return new Set([String(value)])
      const normalized = String(value)
        .toLowerCase()
        .replace(/\s+and\s+/g, ',')
        .replace(/[/&]/g, ',')
      return new Set(
        normalized
          .split(',')
          .map(v => v.trim())
          .filter(Boolean)
      )
    }

    properties.forEach(prop => {
      if (guessedCharacter[prop] === targetCharacter[prop]) {
        hints[prop] = 'green'
      } else {
        const isNumber = typeof guessedCharacter[prop] === 'number' || typeof targetCharacter[prop] === 'number'
        if (!isNumber) {
          const guessSet = toValueSet(guessedCharacter[prop])
          const targetSet = toValueSet(targetCharacter[prop])
          const hasOverlap = [...guessSet].some(v => targetSet.has(v))
          hints[prop] = hasOverlap ? 'yellow' : 'red'
        } else {
          hints[prop] = 'red'
        }
      }
    })

    setGuesses(prev => [...prev, { character: guessedCharacter, hints }])
  }

  const isSolved = Boolean(
    targetCharacter &&
    guesses.some(g => String(g?.character?.name).toLowerCase() === String(targetCharacter?.name).toLowerCase())
  )

  return { guesses, addGuess, resetGuesses, targetCharacter, allCharacters, loading, error, isSolved }
}
