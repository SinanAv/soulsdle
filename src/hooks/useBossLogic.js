import { useMemo, useState } from 'react'
import useCharacterModeLogic from './useCharacterModeLogic'

const BOSS_GUESSES_STORAGE_KEY = 'soulsdle:bossGuesses'

export default function useBossLogic() {
  const base = useCharacterModeLogic({
    mode: 'boss',
    storageKey: BOSS_GUESSES_STORAGE_KEY,
    includeBosses: true,
    invalidPickMessage: 'Daily pick is not a boss. Update the picker to only choose bosses for Boss of the Day.'
  })

  const { guesses, targetCharacter } = base

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
    return targetCharacter.game || null
  }, [targetCharacter])

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
