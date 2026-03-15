import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import GuessInput from './GuessInput'
import useLocationLogic from '../../hooks/useLocationLogic'
import getStoragePublicUrl, { getStoragePublicUrlForExt } from '../../utils/getStoragePublicUrl'

const LOCATION_BUCKET = 'locations'
const REVEAL_COLS = 4
const REVEAL_ROWS = 4
const BASE_REVEALED_TILES = 1
const REVEAL_TILES_PER_GUESS = 1

const getLocationImageUrl = (name) => {
  return getStoragePublicUrl(LOCATION_BUCKET, name)
}

const hashStringToSeed = (value) => {
  const text = String(value || '')
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const mulberry32 = (seed) => {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = (items, seedText) => {
  const result = [...items]
  const rand = mulberry32(hashStringToSeed(seedText))
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1))
    const tmp = result[index]
    result[index] = result[swapIndex]
    result[swapIndex] = tmp
  }
  return result
}

export default function LocationMode() {
  const {
    allLocations,
    targetLocation,
    guesses,
    addGuess,
    resetGuesses,
    loading,
    error,
  } = useLocationLogic()

  const formattedGuesses = guesses.map((name) => ({ character: { name } }))
  const displayGuesses = [...guesses].reverse()

  const [previewError, setPreviewError] = useState(false)
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState('')

  const { jpgUrl, webpUrl } = useMemo(() => {
    const name = targetLocation?.name
    return {
      jpgUrl: getLocationImageUrl(name),
      webpUrl: getStoragePublicUrlForExt(LOCATION_BUCKET, name, 'webp')
    }
  }, [targetLocation?.name])

  useEffect(() => {
    setPreviewError(false)
    setResolvedPreviewUrl('')
  }, [jpgUrl, webpUrl])

  useEffect(() => {
    if (!webpUrl && !jpgUrl) return () => {}

    let isCanceled = false

    const resolveUrl = (primaryUrl, fallbackUrl) => {
      if (!primaryUrl) {
        if (fallbackUrl) {
          resolveUrl(fallbackUrl, '')
        } else if (!isCanceled) {
          setPreviewError(true)
        }
        return
      }

      const img = new Image()
      img.onload = () => {
        if (isCanceled) return
        setResolvedPreviewUrl(primaryUrl)
      }
      img.onerror = () => {
        if (isCanceled) return
        if (fallbackUrl) {
          resolveUrl(fallbackUrl, '')
        } else {
          setPreviewError(true)
        }
      }
      img.src = primaryUrl
    }

    resolveUrl(webpUrl, jpgUrl)

    return () => {
      isCanceled = true
    }
  }, [webpUrl, jpgUrl])

  useEffect(() => {
    if (targetLocation?.name) {
      console.log('location of the day is', JSON.stringify(targetLocation.name))
    }
  }, [targetLocation])

  const isSolved = Boolean(
    targetLocation &&
      guesses.some((name) => name.toLowerCase() === targetLocation.name.toLowerCase())
  )

  const totalTiles = REVEAL_COLS * REVEAL_ROWS
  const revealCount = Math.min(
    totalTiles,
    isSolved
      ? totalTiles
      : BASE_REVEALED_TILES + guesses.length * REVEAL_TILES_PER_GUESS
  )

  const revealOrder = useMemo(() => {
    const indices = Array.from({ length: totalTiles }, (_, index) => index)
    return shuffle(indices, targetLocation?.name || '')
  }, [targetLocation?.name, totalTiles])

  const revealedTiles = useMemo(() => {
    return new Set(revealOrder.slice(0, revealCount))
  }, [revealOrder, revealCount])

  return (
    <div className="quotes-mode location-mode">
      <div className="mode-header">
        <Link className="back-button" to="/">Back</Link>
        <h2>Location Mode</h2>
      </div>

      <div className="location-card">
        <h1 className="location-title">Guess the name of today&apos;s location</h1>
        <div className="location-preview">
          {loading && <p className="preview-helper">Loading location of the day…</p>}
          {!previewError && resolvedPreviewUrl && (
            <div
              className="location-reveal"
              style={{
                gridTemplateColumns: `repeat(${REVEAL_COLS}, 1fr)`,
                gridTemplateRows: `repeat(${REVEAL_ROWS}, 1fr)`
              }}
            >
              {Array.from({ length: totalTiles }, (_, index) => {
                const isRevealed = revealedTiles.has(index)
                const row = Math.floor(index / REVEAL_COLS)
                const col = index % REVEAL_COLS
                const x = (col / (REVEAL_COLS - 1)) * 100
                const y = (row / (REVEAL_ROWS - 1)) * 100

                return (
                  <div
                    key={index}
                    className={`location-tile${isRevealed ? ' is-revealed' : ''}`}
                    style={{
                      backgroundImage: `url("${resolvedPreviewUrl}")`,
                      backgroundSize: `${REVEAL_COLS * 100}% ${REVEAL_ROWS * 100}%`,
                      backgroundPosition: `${x}% ${y}%`
                    }}
                  />
                )
              })}
            </div>
          )}
          {error && <p className="preview-helper error">{error}</p>}
          {(previewError || !resolvedPreviewUrl) && !loading && !error && (
            <p className="preview-helper">No location image yet.</p>
          )}
        </div>

        <GuessInput
          onGuessSubmit={addGuess}
          onReset={resetGuesses}
          allCharacters={allLocations}
          guesses={formattedGuesses}
          showSuggestionImages={false}
        />
      </div>

      <div className="hint-panel">
        <div className="hint-results">
          <p className="hint-placeholder">
            Placeholder for future hints
          </p>
        </div>
      </div>

      {displayGuesses.length > 0 && (
        <div className="quote-guess-list location-guess-list">
          {displayGuesses.map((name, index) => {
            const normalizedGuess = String(name || '').trim().toLowerCase()
            const normalizedTarget = String(targetLocation?.name || '').trim().toLowerCase()
            const hasTarget = Boolean(normalizedTarget)
            const isCorrectGuess = hasTarget && normalizedGuess === normalizedTarget
            const statusClass = hasTarget ? (isCorrectGuess ? ' is-correct' : ' is-wrong') : ''

            return (
              <div
                key={`${name}-${index}`}
                className={`quote-guess location-guess${statusClass}`}
              >
                <div className="quote-guess-name location-guess-name">{name}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
