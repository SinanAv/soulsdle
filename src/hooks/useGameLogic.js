import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import getCharacterOfDay from '../utils/characterOfDay'

export default function useGameLogic() {
  const GUESSES_STORAGE_KEY = 'soulsdle:guesses'
  const [allCharacters, setAllCharacters] = useState([])
  const [targetCharacter, setTargetCharacter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [guesses, setGuesses] = useState(() => {
    try {
      const raw = localStorage.getItem(GUESSES_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(GUESSES_STORAGE_KEY, JSON.stringify(guesses))
    } catch {
      // Ignore storage errors (e.g. private mode or quota).
    }
  }, [guesses, GUESSES_STORAGE_KEY])

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

  // Function to add a new guess
  const addGuess = (guessName) => {
    if (!guessName.trim()) return
    if (!targetCharacter) return

    // Find the guessed character by name
    const guessedCharacter = allCharacters.find(
      c => c.name.toLowerCase() === guessName.toLowerCase()
    )

    if (!guessedCharacter) return // ignore invalid names

    // Generate hints
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

    // Add to guesses array: store both character and hints
    setGuesses(prev => [...prev, { character: guessedCharacter, hints }])
  }

  return { guesses, addGuess, resetGuesses, targetCharacter, allCharacters, loading, error }
}
