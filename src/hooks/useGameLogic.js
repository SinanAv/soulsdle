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
  const [quotes, setQuotes] = useState([])
  const [targetCharacter, setTargetCharacter] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [firstHintRevealed, setFirstHintRevealed] = useState(false)
  const [nameLengthHintRevealed, setNameLengthHintRevealed] = useState(false)

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

  const [firstHintUnlocked, setFirstHintUnlocked] = useState(() => {
    try {
      const raw = localStorage.getItem(GUESSES_STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        if (parsed.dateKey === todayKey) {
          return Boolean(parsed.firstHintUnlocked)
        }
      }
      return false
    } catch {
      return false
    }
  })

  const [nameLengthHintUnlocked, setNameLengthHintUnlocked] = useState(() => {
    try {
      const raw = localStorage.getItem(GUESSES_STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        if (parsed.dateKey === todayKey) {
          return Boolean(parsed.nameLengthHintUnlocked)
        }
      }
      return false
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(
        GUESSES_STORAGE_KEY,
        JSON.stringify({ dateKey: todayKey, guesses, firstHintUnlocked, nameLengthHintUnlocked })
      )
    } catch {
    }
  }, [guesses, firstHintUnlocked, nameLengthHintUnlocked, GUESSES_STORAGE_KEY, todayKey])

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

  const firstHintQuote = (() => {
    if (!targetCharacter) return null
    const characterQuotes = quotes.filter(
      q => String(q?.character_id) === String(targetCharacter?.id) && q?.quote
    )
    if (characterQuotes.length === 0) return null
    return characterQuotes[0]?.quote || null
  })()

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

    const guessedCorrectly = String(guessedCharacter?.name).toLowerCase() === String(targetCharacter?.name).toLowerCase()
    if (!guessedCorrectly && !firstHintUnlocked) {
      setFirstHintUnlocked(true)
    }

    if (!guessedCorrectly) {
      const wrongGuessesToday = guesses.filter(
        g => String(g?.character?.name).toLowerCase() !== String(targetCharacter?.name).toLowerCase()
      ).length + 1

      if (wrongGuessesToday >= 3 && !nameLengthHintUnlocked) {
        setNameLengthHintUnlocked(true)
      }
    }
  }

  const toggleFirstHint = () => {
    if (!firstHintUnlocked) return
    setFirstHintRevealed(prev => !prev)
  }

  const toggleNameLengthHint = () => {
    if (!nameLengthHintUnlocked) return
    setNameLengthHintRevealed(prev => !prev)
  }

  const nameLengthHintValue = targetCharacter?.name
    ? targetCharacter.name.replace(/\s+/g, '').length
    : null

  const isSolved = Boolean(
    targetCharacter &&
    guesses.some(g => String(g?.character?.name).toLowerCase() === String(targetCharacter?.name).toLowerCase())
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
    nameLengthHintUnlocked,
    nameLengthHintRevealed,
    toggleNameLengthHint,
    nameLengthHintValue
  }
}

