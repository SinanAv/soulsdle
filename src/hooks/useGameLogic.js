import { useMemo, useState } from 'react'
import useCharacterModeLogic from './useCharacterModeLogic'

const GUESSES_STORAGE_KEY = 'soulsdle:characterGuesses'

export default function useGameLogic() {
  const base = useCharacterModeLogic({
    mode: 'character',
    storageKey: GUESSES_STORAGE_KEY,
    includeBosses: false,
    invalidPickMessage: 'Daily pick is a boss. Update the picker to exclude bosses for Character of the Day.'
  })

  const { guesses, quotes, targetCharacter } = base

  const [firstClueRevealed, setFirstClueRevealed] = useState(false)
  const [locationClueRevealed, setLocationClueRevealed] = useState(false)

  const wrongGuessesToday = useMemo(() => {
    if (!targetCharacter) return 0
    const targetName = String(targetCharacter?.name || '').toLowerCase()
    if (!targetName) return 0

    return guesses.filter((guess) => String(guess?.character?.name || '').toLowerCase() !== targetName).length
  }, [guesses, targetCharacter])

  const firstClueUnlocked = wrongGuessesToday >= 1
  const locationClueUnlocked = wrongGuessesToday >= 3

  const firstClueQuote = useMemo(() => {
    if (!targetCharacter) return null

    const characterQuotes = quotes.filter(
      (quote) => String(quote?.character_id) === String(targetCharacter?.id) && quote?.quote
    )

    if (characterQuotes.length === 0) return null
    return characterQuotes[0]?.quote || null
  }, [quotes, targetCharacter])

  const toggleFirstClue = () => {
    if (!firstClueUnlocked) return
    setFirstClueRevealed((prev) => !prev)
  }

  const toggleLocationClue = () => {
    if (!locationClueUnlocked) return
    setLocationClueRevealed((prev) => !prev)
  }

  const locationClueValue = targetCharacter?.location || null

  return {
    ...base,
    firstClueQuote,
    firstClueUnlocked,
    firstClueRevealed,
    toggleFirstClue,
    locationClueUnlocked,
    locationClueRevealed,
    toggleLocationClue,
    locationClueValue
  }
}
